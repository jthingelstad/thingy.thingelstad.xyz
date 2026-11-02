"""Export web derivatives from the approved master, without saving the source.

Run Blender --background <master> --python-exit-code 1 --python
tools/export_character.py -- --outfit=workshop [--stills-only].
"""
import bpy, sys, math, json, time, ast
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

ROOT = Path(__file__).resolve().parents[1]
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
KEY = next((a.split('=', 1)[1] for a in ARGS if a.startswith('--outfit=')), 'workshop')
INDEX = ['librarian', 'trail', 'workshop', 'concert'].index(KEY)
OUT = ROOT / 'public/character/v0.10'
RAW = ROOT / 'local-only/bakes' / KEY
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)
(OUT / 'poses').mkdir(exist_ok=True)
scene = bpy.context.scene
rig = bpy.data.objects['Thingy_Body_Rig']
rig['outfit'] = INDEX
rig['antenna_on'] = False
rig['laptop_visible'] = KEY == 'workshop'
rig.update_tag()
bpy.context.view_layer.update()
scene.render.fps = 24
scene.render.film_transparent = True
scene.use_nodes = False
scene.cycles.samples = 40
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = device.type == 'METAL'
    scene.cycles.device = 'GPU'
except Exception:
    scene.cycles.device = 'CPU'

present = ['Thingy v06 · Original', 'Thingy v07 · Trail lookout',
           'Thingy v07 · Workshop present', 'Thingy v07 · Concert listen'][INDEX]
# Add an in-memory performance to the derivative, keeping the master intact.
# Its tucked wrist and head tilt read as thinking rather than another point.
REST = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in rig.data.bones}
helpers = ast.parse((Path(bpy.data.filepath).parent / 'build_likeness_v04.py').read_text())
exec(compile(ast.Module(body=[n for n in helpers.body if isinstance(n, ast.FunctionDef)
                              and n.name in {'aim', 'aim_hand', 'curl'}], type_ignores=[]), 'FK helpers', 'exec'), globals())
rig.animation_data.action = bpy.data.actions['Thingy v06 · Original']
scene.frame_set(1)
bpy.context.view_layer.update()
thinking = rig.animation_data.action.copy()
thinking.name = 'Web · Thoughtful'
rig.animation_data.action = thinking
side = 'R'
shoulder = rig.pose.bones['upper_arm.' + side].head.copy()
wrist = Vector((-.28, -.48, 1.40))
delta = wrist - shoulder
distance = delta.length
axis = delta.normalized()
upper = (REST['upper_arm.' + side][1] - REST['upper_arm.' + side][0]).length
lower = (REST['forearm.' + side][1] - REST['forearm.' + side][0]).length
assert distance < upper + lower
along = (upper * upper - lower * lower + distance * distance) / (2 * distance)
height = math.sqrt(max(0, upper * upper - along * along))
hint = Vector((-.9, -.16, 1.0)) - shoulder
perp = (hint - axis * hint.dot(axis)).normalized()
elbow = shoulder + axis * along + perp * height
aim('upper_arm.R', elbow - shoulder)
aim('forearm.R', wrist - elbow)
aim_hand('R', (.20, .05, 1))
curl('R', .85)
bpy.context.view_layer.update()
state = {b.name: (b.rotation_quaternion.copy(), b.location.copy(), b.scale.copy()) for b in rig.pose.bones}
for frame in range(1, 98, 12):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    for bone in rig.pose.bones:
        q, loc, scale = state[bone.name]
        bone.rotation_quaternion = q
        bone.location = loc
        bone.scale = scale
    rig.pose.bones['head'].rotation_quaternion = state['head'][0] @ Quaternion((0, 0, 1), math.radians(-8 + 2 * math.sin((frame - 1) / 96 * math.tau)))
    for bone in rig.pose.bones:
        for path in ['rotation_quaternion', 'location', 'scale']:
            bone.keyframe_insert(path, frame=frame, group=bone.name)
source_actions = {
    'hello': 'Thingy v06 · Hello', 'present': present,
    'thinking': thinking.name, 'rest': 'Thingy v06 · Neutral',
}
still_frames = {'hello': 49, 'present': 1, 'thinking': 37, 'rest': 1}
if '--skip-stills' not in ARGS:
    cam = scene.camera
    cam.location = (3.5, -12, 3.56)
    cam.rotation_euler = (Vector((.06, 0, 1.40)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 3.20
    scene.render.resolution_x = scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    bpy.data.objects['Studio ground'].hide_render = True
    for pose in (source_actions if KEY == 'workshop' else ['present']):
        rig['laptop_visible'] = KEY == 'workshop' and pose == 'present'
        rig.update_tag()
        rig.animation_data.action = bpy.data.actions[source_actions[pose]]
        scene.frame_set(still_frames[pose])
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / 'poses' / (KEY + '-' + pose + '.png'))
        bpy.ops.render.render(write_still=True)
        print('WEB_STILL', KEY, pose, flush=True)
if '--stills-only' in ARGS:
    raise SystemExit(0)

# Capture visible outfit meshes while its visibility drivers still exist.
rig['laptop_visible'] = KEY == 'workshop'
rig.update_tag()
bpy.context.view_layer.update()
objects = [o for o in bpy.data.objects if o.type == 'MESH' and not o.hide_render
           and any(c.name.startswith('Thingy ·') and 'optional' not in c.name
                   and 'source reference' not in c.name for c in o.users_collection)]
rig.animation_data.action = bpy.data.actions['Thingy v06 · Neutral']
scene.frame_set(1)
rig.data.pose_position = 'REST'
bpy.context.view_layer.update()
source_count = sum(len(o.data.vertices) for o in objects)

# Preserve per-object generated coordinates when the meshes become one atlas.
for ob in objects:
    ob.hide_set(False)
    ob.hide_viewport = False
    ob.animation_data_clear()
    if KEY == 'workshop' and any(s in ob.name for s in ['laptop', 'screen artwork', 'keyboard image']):
        group = ob.vertex_groups.new(name='WEB_PROP_LAPTOP')
        group.add(list(range(len(ob.data.vertices))), 1, 'REPLACE')
    if ob.data.shape_keys:
        for key in ob.data.shape_keys.key_blocks:
            key.value = 0
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.shape_key_remove(all=True)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    for modifier in list(ob.modifiers):
        if modifier.type != 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    # Rigid housings and small round parts are deliberately oversampled in
    # the print/render master. Simplify the delivery copy, preserving materials.
    count = len(ob.data.vertices)
    target = 6000 if ob.name.startswith('Ear ·') else 8000 if 'CRT housing' in ob.name else 5500 if 'coat' in ob.name else 3500 if count > 4000 else 500
    if count > target * 1.3:
        modifier = ob.modifiers.new('Web delivery geometry', 'DECIMATE')
        modifier.ratio = target / count
        modifier.delimit = {'MATERIAL', 'UV'}
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    if not ob.data.uv_layers:
        ob.data.uv_layers.new(name='SourceUV')
    else:
        ob.data.uv_layers.active.name = 'SourceUV'
    attr = ob.data.attributes.new('source_generated', 'FLOAT_VECTOR', 'POINT')
    lo = Vector(tuple(min(v.co[i] for v in ob.data.vertices) for i in range(3)))
    hi = Vector(tuple(max(v.co[i] for v in ob.data.vertices) for i in range(3)))
    for vertex, datum in zip(ob.data.vertices, attr.data):
        datum.vector = tuple((vertex.co[i] - lo[i]) / max(hi[i] - lo[i], 1e-8) for i in range(3))
    matrix = ob.matrix_world.copy()
    ob.parent = None
    ob.matrix_world = matrix

materials = list({m for ob in objects for m in ob.data.materials if m})
for mat in materials:
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    uv = nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'SourceUV'
    generated = nodes.new('ShaderNodeAttribute')
    generated.attribute_name = 'source_generated'
    for node in list(nodes):
        if node.type == 'UVMAP':
            node.uv_map = 'SourceUV'
        if node.type == 'TEX_IMAGE' and not node.inputs['Vector'].is_linked:
            links.new(uv.outputs['UV'], node.inputs['Vector'])
        if node.type in ['TEX_NOISE', 'TEX_WAVE', 'TEX_VORONOI'] and not node.inputs['Vector'].is_linked:
            links.new(generated.outputs['Vector'], node.inputs['Vector'])
        if node.type == 'TEX_COORD':
            for link in list(node.outputs['Generated'].links):
                links.new(generated.outputs['Vector'], link.to_socket)
            for link in list(node.outputs['UV'].links):
                links.new(uv.outputs['UV'], link.to_socket)

bpy.ops.object.select_all(action='DESELECT')
for ob in objects:
    ob.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'Thingy_' + KEY
body.data.name = 'Thingy_' + KEY + '_geometry'
body.data.uv_layers.new(name='WebUV')
body.data.uv_layers.active_index = len(body.data.uv_layers) - 1
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(68), island_margin=.007)
bpy.ops.object.mode_set(mode='OBJECT')
body.data.uv_layers['WebUV'].active_render = True

scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.render.bake.use_clear = True
scene.render.bake.margin = 8
images = {}
for channel in ['color', 'roughness', 'normal']:
    image = bpy.data.images.new(KEY + '_' + channel, width=2048, height=2048, alpha=False)
    image.colorspace_settings.name = 'sRGB' if channel == 'color' else 'Non-Color'
    images[channel] = image
    restore = []
    for mat in materials:
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = image
        nodes.active = tex
        if channel != 'normal':
            shader = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
            output = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
            previous = output.inputs['Surface'].links[0].from_socket
            emit = nodes.new('ShaderNodeEmission')
            source = shader.inputs['Base Color' if channel == 'color' else 'Roughness']
            if source.is_linked:
                links.new(source.links[0].from_socket, emit.inputs['Color'])
            elif channel == 'color':
                emit.inputs['Color'].default_value = source.default_value
            else:
                value = source.default_value
                emit.inputs['Color'].default_value = (value, value, value, 1)
            links.new(emit.outputs[0], output.inputs['Surface'])
            restore.append((mat, output, previous, emit))
    bpy.ops.object.bake(type='NORMAL' if channel == 'normal' else 'EMIT')
    image.filepath_raw = str(RAW / (channel + '.png'))
    image.file_format = 'PNG'
    image.save()
    for mat, output, previous, emit in restore:
        mat.node_tree.links.new(previous, output.inputs['Surface'])
        mat.node_tree.nodes.remove(emit)
    print('WEB_BAKED', KEY, channel, flush=True)

# Three atlas materials retain separate runtime control of face and beacon.
web_materials = []
for name in ['Surface', 'Face', 'Beacon']:
    mat = bpy.data.materials.new('Thingy_' + name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Specular IOR Level'].default_value = .2
    uv = nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'WebUV'
    for channel, image in images.items():
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = image
        links.new(uv.outputs['UV'], tex.inputs['Vector'])
        if channel == 'normal':
            normal = nodes.new('ShaderNodeNormalMap')
            normal.inputs['Strength'].default_value = .65
            links.new(tex.outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], shader.inputs['Normal'])
        else:
            links.new(tex.outputs['Color'], shader.inputs['Base Color' if channel == 'color' else 'Roughness'])
    if name == 'Face':
        shader.inputs['Emission Color'].default_value = (.64, .72, .37, 1)
        shader.inputs['Emission Strength'].default_value = .12
    if name == 'Beacon':
        shader.inputs['Emission Color'].default_value = (1, .23, .02, 1)
        # Keep an emissive material distinct through glTF material deduplication.
        # The runtime sets its intensity to zero before the first visible frame.
        shader.inputs['Emission Strength'].default_value = 1
    web_materials.append(mat)
old_mats = list(body.data.materials)
indices = [2 if 'antenna lens' in old_mats[p.material_index].name else 1 if 'phosphor face' in old_mats[p.material_index].name else 0 for p in body.data.polygons]
body.data.materials.clear()
for mat in web_materials:
    body.data.materials.append(mat)
for polygon, index in zip(body.data.polygons, indices):
    polygon.material_index = index
# Source UVs have served their purpose; the delivery model needs one set.
body.data.uv_layers.remove(body.data.uv_layers['SourceUV'])

# A removable prop remains a separate skinned node, so greeting/rest poses
# do not carry the laptop around on an unsupported palm.
delivery_meshes = [body]
if KEY == 'workshop':
    prop_group = body.vertex_groups.get('WEB_PROP_LAPTOP')
    if prop_group:
        bpy.context.view_layer.objects.active = body
        scene.tool_settings.mesh_select_mode = (True, False, False)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.ops.object.mode_set(mode='OBJECT')
        for vertex in body.data.vertices:
            vertex.select = any(g.group == prop_group.index for g in vertex.groups)
        before = set(bpy.data.objects)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')
        laptop = next(o for o in bpy.data.objects if o not in before)
        laptop.name = 'Thingy_Laptop'
        assert len(body.data.vertices) > 15000 and 0 < len(laptop.data.vertices) < 6000
        delivery_meshes.append(laptop)
for ob in delivery_meshes:
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    triangulate = ob.modifiers.new('Web tangent triangles', 'TRIANGULATE')
    bpy.ops.object.modifier_apply(modifier=triangulate.name)

actions = {}
for name, source in source_actions.items():
    action = bpy.data.actions[source].copy()
    action.name = 'web_' + name
    if action.frame_range[1] <= action.frame_range[0]:
        rig.animation_data.action = action
        scene.frame_set(1)
        bpy.context.view_layer.update()
        for bone in rig.pose.bones:
            for path in ['rotation_quaternion', 'location', 'scale']:
                bone.keyframe_insert(path, frame=2, group=bone.name)
    actions[name] = action
rig.animation_data.action = actions['present']
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
for action in list(bpy.data.actions):
    if action not in actions.values():
        bpy.data.actions.remove(action)
for name, action in actions.items():
    action.name = name
rig.data.pose_position = 'POSE'
scene.frame_set(1)
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
for ob in delivery_meshes:
    ob.select_set(True)
bpy.context.view_layer.objects.active = rig
params = dict(filepath=str(RAW / (KEY + '.glb')), export_format='GLB', use_selection=True,
              export_animations=True, export_animation_mode='ACTIONS', export_skins=True,
              export_morph=False, export_apply=False, export_yup=True, export_extras=False,
              export_texcoords=True, export_normals=True, export_tangents=True,
              export_anim_single_armature=True, export_force_sampling=True,
              export_frame_range=False, export_materials='EXPORT')
valid = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
bpy.ops.export_scene.gltf(**{key: value for key, value in params.items() if key in valid})
report = {'source_version': '0.10', 'outfit': KEY, 'source_vertices': source_count,
          'web_vertices': len(body.data.vertices), 'polygons': len(body.data.polygons),
          'bones': len(rig.data.bones), 'clips': list(actions), 'atlas_size': 2048,
          'source_master_saved': False}
(RAW / 'report.json').write_text(json.dumps(report, indent=2))
print('WEB_EXPORT_COMPLETE', json.dumps(report), flush=True)
