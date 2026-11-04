"""Export the Librarian web derivative from the v0.14 master, without saving the source.

    blender --background <thingy-character>/source/Thingy-wardrobe-v0.14.blend \
      --python-exit-code 1 --python tools/export_character_v014.py [-- --reference-only | --reuse-bakes]

v0.10's export (tools/export_character.py, Blender 4.5) baked each material on
to its own decimated copy, which is fine for a plain coat. From v0.13 the jacket's
look is in the cloth, so this one bakes the full master on to a lighter body:
folds, seams and topstitch reach the browser as a normal map and colour, not as
geometry. The face is the master's own atlas on the screen, chosen by a cell.

Each family of parts bakes alone, on to its own low parts: a finger cannot pick up
the charcoal knuckle it sits against, or a lapel the shirt behind it. Only the
contact shading sees the whole figure. --reuse-bakes skips the baking and starts
from the raw channels of the last run, to change the grade without the wait.

Writes raw files to local-only/bakes/v0.14/librarian/; tools/optimize-v014.mjs
makes the delivery GLB from them.
"""
import ast
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector  # noqa: F401  (the FK helpers use Matrix)

ROOT = Path(__file__).resolve().parents[1]
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
KEY = 'librarian'
RAW = ROOT / 'local-only/bakes/v0.14' / KEY
RAW.mkdir(parents=True, exist_ok=True)
ATLAS_SIZE = 2048
SCREEN = 'Head · v04 recessed charcoal screen'
COLS, ROWS = 4, 5
DEFAULT_FACE_SLOT = 0  # original, the face in reference/thingy-original.png
AO_DISTANCE, AO_STRENGTH = 0.28, 0.75
SAMPLES = {'color': 16, 'metallic': 4, 'roughness': 4, 'normal': 16, 'ao': 96}
# Families that must not see each other in the bake, by the part's first material.
FAMILIES = {
    'navy': ('v13 · brushed navy felt', 'v13 · sunken navy seam', 'v13 · navy topstitch thread'),
    'dark': ('Reference · worn charcoal limbs', 'Soft charcoal joint material', 'Graphite inner body'),
    'ivory': ('v04 · warm ivory hand shells', 'Reference · warm ivory foot shells', 'Painted warm ivory',
              'v04 · warm ivory painted housing'),
    'badge': (),
    'shirt': ('v04 · warm linen shirt',),
    'paper': ('v04 · paper wrapped pocket tools',),
    'brass': ('v04 · brushed brass buttons',),
    'tangerine': ('v04 · tangerine enamel', 'v06 · bow tie printed cotton image', 'v06 · switchable antenna lens'),
}
GROUPS = list(FAMILIES)
# A delivery grade in linear light, per family, toward reference/thingy-original.png.
# The master's felt gets its dusty lift from a viewing-angle term a bake cannot keep.
GRADE = {'navy': (1.8, 1.8, 1.85), 'ivory': (.95, 1.05, 1.25), 'badge': (1, .93, .62)}

scene = bpy.context.scene
rig = bpy.data.objects['Thingy_Body_Rig']
rig['outfit'] = 0
rig['antenna_on'] = False
rig['tool'] = 0
rig['face'] = DEFAULT_FACE_SLOT
rig.update_tag()
bpy.context.view_layer.update()
assert rig['version'] == 0.14 or str(rig['version']) == '0.14', rig['version']
scene.render.fps = 24
scene.render.film_transparent = True
scene.render.use_compositing = False
scene.render.use_stamp = False
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = device.type == 'METAL'
    scene.cycles.device = 'GPU'
except Exception:
    scene.cycles.device = 'CPU'
scene.cycles.use_denoising = False
bpy.data.objects['Studio ground'].hide_render = True


def use_action(action):
    rig.animation_data.action = action
    if rig.animation_data.action_slot is None and action.slots:
        rig.animation_data.action_slot = action.slots[0]


if '--reference-only' in ARGS:
    # The same camera as the web component: what the browser is compared with.
    use_action(bpy.data.actions['Thingy v06 · Original'])
    scene.frame_set(1)
    bpy.context.view_layer.update()
    cam = scene.camera
    cam.location = (3.5, -12, 3.0)
    cam.rotation_euler = (Vector((0, 0, 1.38)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 3.22
    scene.render.resolution_x = scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.cycles.samples = 96
    scene.render.filepath = str(RAW / 'reference-present.png')
    bpy.ops.render.render(write_still=True)
    print('WEB_REFERENCE', scene.render.filepath, flush=True)
    raise SystemExit(0)

# An in-memory performance, as in v0.10; the master is never saved.
# Its tucked wrist and head tilt read as thinking rather than another point.
REST = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in rig.data.bones}
helpers = ast.parse((Path(bpy.data.filepath).parent / 'build_likeness_v04.py').read_text())
exec(compile(ast.Module(body=[n for n in helpers.body if isinstance(n, ast.FunctionDef)
                              and n.name in {'aim', 'aim_hand', 'curl'}], type_ignores=[]), 'FK helpers', 'exec'), globals())
use_action(bpy.data.actions['Thingy v06 · Original'])
scene.frame_set(1)
bpy.context.view_layer.update()
thinking = rig.animation_data.action.copy()
thinking.name = 'Web · Thoughtful'
use_action(thinking)
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
aim('upper_arm.R', elbow - shoulder)  # noqa: F821
aim('forearm.R', wrist - elbow)  # noqa: F821
aim_hand('R', (.20, .05, 1))  # noqa: F821
curl('R', .85)  # noqa: F821
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
    rig.pose.bones['head'].rotation_quaternion = state['head'][0] @ Quaternion(
        (0, 0, 1), math.radians(-8 + 2 * math.sin((frame - 1) / 96 * math.tau)))
    for bone in rig.pose.bones:
        for path in ['rotation_quaternion', 'location', 'scale']:
            bone.keyframe_insert(path, frame=frame, group=bone.name)
source_actions = {
    'hello': 'Thingy v06 · Hello', 'present': 'Thingy v06 · Original',
    'thinking': thinking.name, 'rest': 'Thingy v06 · Neutral',
}

# The master at rest is the bake source.
visible = [o for o in bpy.data.objects if o.type == 'MESH' and not o.hide_render
           and any(c.name.startswith('Thingy ·') and 'optional' not in c.name
                   and 'source reference' not in c.name for c in o.users_collection)]
use_action(bpy.data.actions['Thingy v06 · Neutral'])
scene.frame_set(1)
rig.data.pose_position = 'REST'
bpy.context.view_layer.update()

# Sealed inside the sleeves and jacket in every pose: they cost atlas and
# vertices and stay in the scene only to shade what is around them.
HIDDEN = ('Core · rounded thorax', 'Core · chest plate', 'Core · abdomen bearing',
          'Shoulder ·', 'Upper arm ·', 'Elbow ·', 'Forearm ·', 'Ankle · L internal', 'Ankle · R internal')
# Thin strips riding on the cloth. They reach the browser through the bake.
BAKED_ONLY = ('topstitch', ' seam')


def family(ob):
    # The name plate shares the head's paint but carries its own printed face.
    if ob.name == 'Badge · v04 warm ivory plate':
        return 'badge'
    first = next(m.name for m in ob.data.materials if m)
    return next(name for name, members in FAMILIES.items() if first in members)


def atlas_share(name):
    """Relative texel density: the coat is most of the picture, and plenty is out of sight."""
    for needle, share in [
        ('continuous open-front coat', 1.7), ('continuous wool', 1.7), ('notched lapel', 1.7), ('rolled collar', 1.7),
        ('Pocket ·', 1.7), ('centre overlap', 1.7), ('warm ivory plate', 1.6), ('shaped orange wing', 1.5),
        ('central knot', 1.5), ('Ear ·', 1.4), ('dark underlay', .25), ('pelvis', .35), ('concealed', .35),
        ('cuff lining', .4), ('flat black sole', .4), ('Neck ·', .5), ('fitted beneath jacket', .6), ('Knee ·', .6),
        ('Shin ·', .6), ('Ankle ·', .6), ('Wrist ·', .6), ('palm', .7),
    ]:
        if needle in name:
            return share
    return 1


def web_vertices(name, count):
    """A delivery budget per part: most of it where the silhouette and folds are."""
    for needle, target in [
        ('continuous open-front coat', 14000), ('continuous wool', 8000), ('rolled notched lapel', 3000),
        ('CRT housing', 7000), ('Ear ·', 5000), ('shaped orange wing', 1400), ('central knot', 350),
        ('fitted beneath jacket', 1600), ('recessed charcoal screen', 1100), ('dark underlay', 1200),
        ('toe cap', 1600), ('heel quarter', 1000), ('flat black sole', 350), ('grip band', 50),
        ('Knuckle ·', 220), ('rounded cap', 300), ('button centre', 140), ('brass button', 200),
        ('sewn button', 100), ('tangerine ball', 700), ('cast base', 500), ('dark stem', 160),
        ('Hand ·', 1000), ('Finger ·', 340), ('Neck ·', 300), ('Core ·', 300), ('wool patch', 500),
    ]:
        if needle in name:
            return target
    return 320


source_vertices = sum(len(o.data.vertices) for o in visible)
low_objects, screen = [], None
for source in visible:
    source.hide_set(False)
    source.hide_viewport = False
    if any(source.name.startswith(p) for p in HIDDEN) or any(p in source.name for p in BAKED_ONLY):
        continue
    low = source.copy()
    low.data = source.data.copy()
    low.name = 'web ' + source.name
    scene.collection.objects.link(low)
    low.animation_data_clear()
    if low.data.shape_keys:
        low.data.animation_data_clear() if low.data.animation_data else None
        low.data.shape_keys.animation_data_clear()
        for key in low.data.shape_keys.key_blocks:
            key.value = 0
        bpy.context.view_layer.objects.active = low
        bpy.ops.object.shape_key_remove(all=True)
    bpy.ops.object.select_all(action='DESELECT')
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    for modifier in list(low.modifiers):
        # Cloth thickness offsets by millimetres from the sheet, inside the bake's
        # reach, and a double-sided sheet draws the same from both sides.
        if modifier.type == 'SOLIDIFY':
            low.modifiers.remove(modifier)
        elif modifier.type != 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    count = len(low.data.vertices)
    target = web_vertices(source.name, count)
    if count > target * 1.2:
        modifier = low.modifiers.new('Web delivery geometry', 'DECIMATE')
        modifier.ratio = target / count
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    if source.name != SCREEN:
        low.data.attributes.new('web_group', 'INT', 'FACE').data.foreach_set(
            'value', [GROUPS.index(family(source))] * len(low.data.polygons))
        low.data.attributes.new('web_share', 'FLOAT', 'FACE').data.foreach_set(
            'value', [atlas_share(source.name)] * len(low.data.polygons))
    matrix = low.matrix_world.copy()
    low.parent = None
    low.matrix_world = matrix
    if source.name == SCREEN:
        screen = low
    else:
        low_objects.append(low)
assert screen is not None and len(low_objects) > 80

bpy.ops.object.select_all(action='DESELECT')
for ob in low_objects:
    ob.select_set(True)
bpy.context.view_layer.objects.active = low_objects[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'Thingy_' + KEY
body.data.name = 'Thingy_' + KEY + '_geometry'
for layer in list(body.data.uv_layers):
    body.data.uv_layers.remove(layer)
body.data.uv_layers.new(name='WebUV')
body.data.uv_layers.active_index = 0
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.003)
bpy.ops.object.mode_set(mode='OBJECT')
# The packer keeps relative sizes, so scaling a part here is its share of the atlas.
shares = np.zeros(len(body.data.polygons), np.float32)
body.data.attributes['web_share'].data.foreach_get('value', shares)
body.data.attributes.remove(body.data.attributes['web_share'])
loop_totals = np.zeros(len(body.data.polygons), np.int32)
body.data.polygons.foreach_get('loop_total', loop_totals)
uv_data = body.data.uv_layers['WebUV'].uv
uv_coords = np.zeros(len(uv_data) * 2, np.float32)
uv_data.foreach_get('vector', uv_coords)
uv_coords *= np.repeat(np.repeat(shares, loop_totals), 2)
uv_data.foreach_set('vector', uv_coords)
body.data.update()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
scene.tool_settings.use_uv_select_sync = True
bpy.ops.uv.pack_islands(rotate=True, shape_method='CONCAVE', margin_method='FRACTION', margin=.0035)
bpy.ops.object.mode_set(mode='OBJECT')
body.data.uv_layers['WebUV'].active_render = True
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
triangulate = body.modifiers.new('Web tangent triangles', 'TRIANGULATE')
bpy.ops.object.modifier_apply(modifier=triangulate.name)
beacon_polygons = [i for i, p in enumerate(body.data.polygons)
                   if 'antenna lens' in body.data.materials[p.material_index].name]
assert beacon_polygons

# Bake: the master's surfaces, selected, on to the active light body.
target_material = bpy.data.materials.new('Web bake target')
target_material.use_nodes = True
target_node = target_material.node_tree.nodes.new('ShaderNodeTexImage')
body.data.materials.clear()
body.data.materials.append(target_material)
sources = [o for o in visible if o.name != SCREEN and not any(o.name.startswith(p) for p in HIDDEN)]
materials = list({m for o in sources for m in o.data.materials if m})
scene.world.light_settings.distance = AO_DISTANCE
face_groups = np.zeros(len(body.data.polygons), np.int32)
body.data.attributes['web_group'].data.foreach_get('value', face_groups)
body.data.attributes.remove(body.data.attributes['web_group'])


def channel_array(image):
    pixels = np.empty(image.size[0] * image.size[1] * 4, np.float32)
    image.pixels.foreach_get(pixels)
    return pixels.reshape(image.size[1], image.size[0], 4)


def write_png(name, pixels, colorspace='Non-Color'):
    image = bpy.data.images.new(KEY + '_' + name, width=ATLAS_SIZE, height=ATLAS_SIZE, alpha=False)
    image.colorspace_settings.name = colorspace
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(RAW / (name + '.png'))
    image.file_format = 'PNG'
    image.save()
    return image


def read_png(name):
    image = bpy.data.images.load(str(RAW / (name + '.png')))
    image.colorspace_settings.name = 'Non-Color'
    pixels = channel_array(image)
    bpy.data.images.remove(image)
    return pixels


def linear_from_srgb(value):
    return np.where(value <= .04045, value / 12.92, ((value + .055) / 1.055) ** 2.4)


def srgb_from_linear(value):
    return np.where(value <= .0031308, value * 12.92, 1.055 * np.maximum(value, 1e-8) ** (1 / 2.4) - .055)


def halve(pixels, hit):
    """Half size in linear light, averaging only what the bake reached."""
    rgb = linear_from_srgb(pixels[..., :3]) * hit[..., None]
    total = rgb[::2, ::2] + rgb[1::2, ::2] + rgb[::2, 1::2] + rgb[1::2, 1::2]
    count = (hit[::2, ::2].astype(np.float32) + hit[1::2, ::2] + hit[::2, 1::2] + hit[1::2, 1::2])
    out = np.ones(count.shape + (4,), np.float32)
    out[..., :3] = srgb_from_linear(total / np.maximum(count, 1)[..., None])
    return out, count > 0


def grow_margin(pixels, reached, passes=24, until=None):
    """Bleed each island outward, so mipmaps and compression never pull in the gaps."""
    rgb = pixels[..., :3].copy()
    reached = reached.copy()
    for _ in range(passes):
        if until is not None and not (until & ~reached).any():
            break
        total = np.zeros_like(rgb)
        count = np.zeros(reached.shape, np.float32)
        for axis, step in ((0, 1), (0, -1), (1, 1), (1, -1)):
            total += np.roll(rgb * reached[..., None], step, axis)
            count += np.roll(reached, step, axis)
        grow = ~reached & (count > 0)
        rgb[grow] = total[grow] / count[grow][..., None]
        reached |= grow
    out = pixels.copy()
    out[..., :3] = rgb
    return out


def bake_all():
    """Every channel, one family at a time, on to that family's own faces."""
    lows = {}
    for index, group in enumerate(GROUPS):
        low = body.copy()
        low.data = body.data.copy()
        low.name = 'bake ' + group
        scene.collection.objects.link(low)
        mesh = bmesh.new()
        mesh.from_mesh(low.data)
        mesh.faces.ensure_lookup_table()
        bmesh.ops.delete(mesh, geom=[f for f, g in zip(mesh.faces, face_groups) if g != index], context='FACES')
        mesh.to_mesh(low.data)
        mesh.free()
        assert low.data.polygons, group
        lows[group] = low
    members = {group: [o for o in sources if family(o) == group] for group in GROUPS}
    print('WEB_FAMILIES', {group: len(parts) for group, parts in members.items()}, flush=True)
    body.hide_render = screen.hide_render = True
    claimed = np.zeros((ATLAS_SIZE, ATLAS_SIZE), np.int32)

    def bake(channel, kind):
        canvas = np.zeros((ATLAS_SIZE, ATLAS_SIZE, 4), np.float32)
        canvas[..., 3] = 1
        for index, group in enumerate(GROUPS):
            # Alpha marks what a bake wrote. No clear and no margin: a margin would
            # write over a neighbouring family's islands. The finished atlas grows one.
            # A bake takes one ray a texel, so a hard colour edge stairsteps. Colour
            # bakes at twice the size and comes down, for the ears and the bow tie.
            size = ATLAS_SIZE * 2 if channel == 'color' else ATLAS_SIZE
            image = bpy.data.images.new(f'{KEY}_{channel}_{group}', width=size, height=size, alpha=True)
            image.colorspace_settings.name = 'sRGB' if channel == 'color' else 'Non-Color'
            image.pixels.foreach_set(np.zeros(size ** 2 * 4, np.float32))
            target_node.image = image
            bpy.ops.object.select_all(action='DESELECT')
            for ob in members[group]:
                ob.select_set(True)
                assert ob.select_get(), ob.name
            for name, low in lows.items():
                low.hide_render = name != group
            lows[group].select_set(True)
            bpy.context.view_layer.objects.active = lows[group]
            target_material.node_tree.nodes.active = target_node
            scene.cycles.samples = SAMPLES[channel]
            bpy.ops.object.bake(type=kind, use_selected_to_active=True, cage_extrusion=.012, max_ray_distance=.04,
                                margin=0, normal_space='TANGENT', target='IMAGE_TEXTURES', use_clear=False)
            pixels = channel_array(image)
            hit = pixels[..., 3] > .5
            assert 0 < hit.sum() < size ** 2, (channel, group, int(hit.sum()))
            if size != ATLAS_SIZE:
                pixels, hit = halve(pixels, hit)
            # The normal bake writes the family's whole UV area, neutral where a ray
            # found nothing, so it says which pixels are whose. A ray that missed in
            # another channel takes the nearest colour from the same family.
            if channel == 'normal':
                claimed[hit] = index + 1
            mine = claimed == index + 1
            filled = grow_margin(pixels, hit, until=mine)
            canvas[mine, :3] = filled[mine, :3]
            bpy.data.images.remove(image)
            print('WEB_BAKED', channel, group, int(mine.sum()), 'missed', int((mine & ~hit).sum()), flush=True)
        write_png('raw-' + channel, canvas)

    def bake_input(channel, socket_name):
        restore = []
        for mat in materials:
            nodes, links = mat.node_tree.nodes, mat.node_tree.links
            shader = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
            output = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output)
            previous = output.inputs['Surface'].links[0].from_socket
            emit = nodes.new('ShaderNodeEmission')
            socket = shader.inputs[socket_name]
            if socket.is_linked:
                links.new(socket.links[0].from_socket, emit.inputs['Color'])
            elif socket_name == 'Base Color':
                emit.inputs['Color'].default_value = socket.default_value
            else:
                value = socket.default_value
                emit.inputs['Color'].default_value = (value, value, value, 1)
            links.new(emit.outputs[0], output.inputs['Surface'])
            restore.append((mat, output, previous, emit))
        bake(channel, 'EMIT')
        for mat, output, previous, emit in restore:
            mat.node_tree.links.new(previous, output.inputs['Surface'])
            mat.node_tree.nodes.remove(emit)

    bake('normal', 'NORMAL')
    bake('ao', 'AO')
    bake_input('color', 'Base Color')
    bake_input('roughness', 'Roughness')
    bake_input('metallic', 'Metallic')
    groups = np.ones((ATLAS_SIZE, ATLAS_SIZE, 4), np.float32)
    groups[..., :3] = (claimed / 255)[..., None]
    write_png('raw-groups', groups)
    for low in lows.values():
        mesh = low.data
        bpy.data.objects.remove(low)
        bpy.data.meshes.remove(mesh)
    body.hide_render = screen.hide_render = False


if '--reuse-bakes' not in ARGS:
    bake_all()


claimed = np.rint(read_png('raw-groups')[..., 0] * 255).astype(np.int32)
reached = claimed > 0
print('WEB_ATLAS_USED', round(float(reached.mean()), 3), flush=True)
# Contact shading goes into the colour, so folds and pockets read under any light.
color = read_png('raw-color')
linear = linear_from_srgb(color[..., :3])
linear *= (1 - AO_STRENGTH + AO_STRENGTH * read_png('raw-ao')[..., 0:1])
for group, factors in GRADE.items():
    linear[claimed == GROUPS.index(group) + 1] *= np.array(factors, np.float32)
color[..., :3] = srgb_from_linear(np.minimum(linear, 1))
images = {'color': write_png('color', grow_margin(color, reached), 'sRGB'),
          'normal': write_png('normal', grow_margin(read_png('raw-normal'), reached))}
# glTF's one metal and roughness map: green is roughness, blue is metal.
packed = np.ones((ATLAS_SIZE, ATLAS_SIZE, 4), np.float32)
packed[..., 1] = read_png('raw-roughness')[..., 0]
packed[..., 2] = read_png('raw-metallic')[..., 0]
orm = write_png('orm', grow_margin(packed, reached))


def surface_material(name):
    mat = bpy.data.materials.new('Thingy_' + name)
    mat.use_nodes = True
    mat.use_backface_culling = False
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Specular IOR Level'].default_value = .2
    uv = nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'WebUV'
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = images['color']
    links.new(uv.outputs['UV'], tex.inputs['Vector'])
    links.new(tex.outputs['Color'], shader.inputs['Base Color'])
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = orm
    links.new(uv.outputs['UV'], tex.inputs['Vector'])
    separate = nodes.new('ShaderNodeSeparateColor')
    links.new(tex.outputs['Color'], separate.inputs['Color'])
    links.new(separate.outputs['Green'], shader.inputs['Roughness'])
    links.new(separate.outputs['Blue'], shader.inputs['Metallic'])
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = images['normal']
    links.new(uv.outputs['UV'], tex.inputs['Vector'])
    normal = nodes.new('ShaderNodeNormalMap')
    links.new(tex.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    return mat, shader


surface, _ = surface_material('Surface')
beacon, beacon_shader = surface_material('Beacon')
beacon_shader.inputs['Emission Color'].default_value = (1, .23, .02, 1)
# Keep it distinct through glTF material deduplication; the component sets the
# intensity to zero before the first visible frame.
beacon_shader.inputs['Emission Strength'].default_value = 1
body.data.materials.clear()
body.data.materials.append(surface)
body.data.materials.append(beacon)
indices = np.zeros(len(body.data.polygons), np.int32)
indices[beacon_polygons] = 1
body.data.polygons.foreach_set('material_index', indices)
body.data.update()

# The face: the master's atlas, lit on a dark screen, one cell at a time. Straight
# alpha over black, in linear light, at half size (a cell is still wider than the
# screen ever draws); the atlas's 12 px clear border keeps cells apart in mipmaps.
master_screen = bpy.data.objects[SCREEN]
atlas = channel_array(master_screen.data.materials[0].node_tree.nodes['Face atlas'].image)
assert atlas.shape == (3300, 4096, 4)
rgb = np.where(atlas[..., :3] <= .04045, atlas[..., :3] / 12.92, ((atlas[..., :3] + .055) / 1.055) ** 2.4) * atlas[..., 3:4]
half = (rgb[::2, ::2] + rgb[1::2, ::2] + rgb[::2, 1::2] + rgb[1::2, 1::2]) / 4
half = np.where(half <= .0031308, half * 12.92, 1.055 * np.maximum(half, 1e-8) ** (1 / 2.4) - .055)
face_image = bpy.data.images.new(KEY + '_faces', width=2048, height=1650, alpha=False)
face_pixels = np.ones((1650, 2048, 4), np.float32)
face_pixels[..., :3] = half
face_image.pixels.foreach_set(face_pixels.ravel())
face_image.filepath_raw = str(RAW / 'faces.png')
face_image.file_format = 'PNG'
face_image.save()
screen.name = 'Thingy_Screen'
screen.data.name = 'Thingy_Screen_geometry'
face = bpy.data.materials.new('Thingy_Face')
face.use_nodes = True
nodes, links = face.node_tree.nodes, face.node_tree.links
shader = nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = (.012, .017, .018, 1)
shader.inputs['Roughness'].default_value = .42
shader.inputs['Specular IOR Level'].default_value = .28
uv = nodes.new('ShaderNodeUVMap')
uv.uv_map = 'FaceUV'
mapping = nodes.new('ShaderNodeMapping')
mapping.vector_type = 'POINT'
mapping.inputs['Scale'].default_value = (1 / COLS, 1 / ROWS, 1)
row, col = divmod(DEFAULT_FACE_SLOT, COLS)
mapping.inputs['Location'].default_value = (col / COLS, (ROWS - 1 - row) / ROWS, 0)
tex = nodes.new('ShaderNodeTexImage')
tex.image = face_image
tex.extension = 'EXTEND'
links.new(uv.outputs['UV'], mapping.inputs['Vector'])
links.new(mapping.outputs[0], tex.inputs['Vector'])
links.new(tex.outputs['Color'], shader.inputs['Emission Color'])
shader.inputs['Emission Strength'].default_value = 1
screen.data.materials.clear()
screen.data.materials.append(face)
bpy.ops.object.select_all(action='DESELECT')
screen.select_set(True)
bpy.context.view_layer.objects.active = screen
triangulate = screen.modifiers.new('Web tangent triangles', 'TRIANGULATE')
bpy.ops.object.modifier_apply(modifier=triangulate.name)

# A sliver with no area in the atlas has no tangent, and glTF requires a unit one.
body.data.calc_tangents(uvmap='WebUV')
tangents = np.zeros(len(body.data.loops) * 3, np.float32)
body.data.loops.foreach_get('tangent', tangents)
body.data.free_tangents()
tangentless = np.linalg.norm(tangents.reshape(-1, 3), axis=1) < .5
slivers = {polygon.index for polygon in body.data.polygons
           if tangentless[polygon.loop_start:polygon.loop_start + polygon.loop_total].any()}
print('WEB_SLIVERS', len(slivers), sum(body.data.polygons[i].area for i in slivers), flush=True)
if slivers:
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    mesh.faces.ensure_lookup_table()
    bmesh.ops.delete(mesh, geom=[mesh.faces[i] for i in slivers], context='FACES_ONLY')
    mesh.to_mesh(body.data)
    mesh.free()

# The performances, then only the rig and the two delivery meshes.
for ob in sources:
    ob.hide_render = True
    ob.hide_set(True)
actions = {}
for name, source in source_actions.items():
    action = bpy.data.actions[source].copy()
    action.name = 'web_' + name
    if action.frame_range[1] <= action.frame_range[0]:
        use_action(action)
        scene.frame_set(1)
        bpy.context.view_layer.update()
        for bone in rig.pose.bones:
            for path in ['rotation_quaternion', 'location', 'scale']:
                bone.keyframe_insert(path, frame=2, group=bone.name)
    actions[name] = action
use_action(actions['present'])
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
for ob in (rig, body, screen):
    ob.hide_set(False)
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
report = {'source_version': '0.14', 'outfit': KEY, 'source_vertices': source_vertices,
          'web_vertices': len(body.data.vertices) + len(screen.data.vertices),
          'polygons': len(body.data.polygons) + len(screen.data.polygons),
          'bones': len(rig.data.bones), 'clips': list(actions), 'atlas_size': ATLAS_SIZE,
          'source_master_saved': False}
(RAW / 'report.json').write_text(json.dumps(report, indent=2))
print('WEB_EXPORT_COMPLETE', json.dumps(report), flush=True)
