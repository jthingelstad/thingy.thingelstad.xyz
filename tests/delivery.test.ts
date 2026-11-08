import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  cacheControl,
  mime,
  newestCharacterVersion,
  prepareObject,
} from "../tools/delivery-plan.mjs";

const json = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../infra/${name}.json`, import.meta.url), "utf8"),
  );
const site = json("site");
const delivery = json("delivery");
const resources = site.Resources;

test("every public file has a MIME type", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [entry.name],
    );
  for (const name of walk("public"))
    if (name !== ".DS_Store")
      assert.ok(mime[path.extname(name) as keyof typeof mime], name);
  assert.equal(
    prepareObject("character/v0.10/trail.glb", Buffer.from("x")).ContentType,
    "model/gltf-binary",
  );
  assert.throws(() => prepareObject("../secret.txt", Buffer.from("x")));
  assert.equal(
    prepareObject(
      "print/v0.13/Thingy-librarian-180mm-v0.13.3mf",
      Buffer.from("x"),
    ).ContentType,
    "model/3mf",
  );
  assert.equal(
    prepareObject(
      "print/v0.13/Thingy-librarian-180mm-v0.13-stl.zip",
      Buffer.from("x"),
    ).ContentType,
    "application/zip",
  );
});

test("caching keeps entry points short and hashed bundles long", () => {
  assert.match(cacheControl("assets/main-abc123.js"), /immutable/);
  assert.match(
    cacheControl("voice/5bb83b2e28abb08e4e4464aeb2a6639e.mp3"),
    /immutable/,
  );
  assert.equal(cacheControl("thingy.js"), "public, max-age=300");
  assert.equal(
    cacheControl("character/v0.10/manifest.json"),
    "public, max-age=300",
  );
  assert.equal(
    cacheControl("character/v0.10/workshop.glb"),
    "public, max-age=86400",
  );
  for (const file of [
    "character/latest/librarian.glb",
    "character/latest/manifest.json",
    "character/latest/poses/library-hello.webp",
  ])
    assert.equal(cacheControl(file), "public, max-age=300", file);
  for (const file of [
    "print/v0.13/Thingy-librarian-180mm-v0.13.3mf",
    "print/v0.13/manifest.json",
    "print/v0.13/front.webp",
  ])
    assert.equal(cacheControl(file), "public, max-age=86400", file);
  for (const page of [
    "index.html",
    "print/index.html",
    "persona/index.html",
    "persona.md",
    "kit/index.html",
    "kit.md",
    "embed/index.html",
    "404.html",
    "sitemap.xml",
    "llms.txt",
  ])
    assert.match(cacheControl(page), /max-age=0/);
});

test("the newest character version is the highest number", () => {
  assert.equal(newestCharacterVersion(["v0.10", "v0.9", "v0.14"]), "v0.14");
  assert.equal(newestCharacterVersion(["latest", "v1.2", "v0.14"]), "v1.2");
});

test("the bucket is private, encrypted, versioned and retained", () => {
  const bucket = resources.SiteBucket;
  assert.equal(bucket.DeletionPolicy, "Retain");
  assert.equal(bucket.UpdateReplacePolicy, "Retain");
  assert.deepEqual(bucket.Properties.PublicAccessBlockConfiguration, {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  });
  assert.equal(bucket.Properties.VersioningConfiguration.Status, "Enabled");
  const statements =
    resources.SiteBucketPolicy.Properties.PolicyDocument.Statement;
  assert.ok(
    statements.some(
      (s: any) =>
        s.Effect === "Deny" &&
        s.Condition?.Bool?.["aws:SecureTransport"] === "false",
    ),
  );
});

test("the distribution stays embeddable and shareable across origins", () => {
  const headers = resources.Headers.Properties.ResponseHeadersPolicyConfig;
  assert.equal(
    headers.SecurityHeadersConfig.FrameOptions,
    undefined,
    "no X-Frame-Options: /embed/ is framed by design",
  );
  assert.deepEqual(headers.CorsConfig.AccessControlAllowOrigins.Items, ["*"]);
  const config = resources.Distribution.Properties.DistributionConfig;
  assert.deepEqual(config.Aliases, ["thingy.thingelstad.xyz"]);
  assert.equal(
    config.DefaultCacheBehavior.ViewerProtocolPolicy,
    "redirect-to-https",
  );
  assert.ok(
    config.CustomErrorResponses.every(
      (r: any) => r.ResponsePagePath === "/404.html" && r.ResponseCode === 404,
    ),
  );
});

test("the site stack owns its DNS names in the thingelstad.xyz zone", () => {
  assert.equal(site.Parameters.HostedZoneId.Default, "Z00131847XOTS27DSIZF");
  assert.deepEqual(resources.Certificate.Properties.DomainValidationOptions, [
    {
      DomainName: "thingy.thingelstad.xyz",
      HostedZoneId: { Ref: "HostedZoneId" },
    },
  ]);
  for (const type of ["A", "AAAA"]) {
    const record = resources[`SiteRecord${type}`].Properties;
    assert.equal(record.Type, type);
    assert.equal(record.Name, "thingy.thingelstad.xyz.");
    assert.equal(record.AliasTarget.HostedZoneId, "Z2FDTNDATAQYW2");
  }
});

test("access logs keep 14 days and never record client IPs or query strings", () => {
  assert.equal(
    resources.AccessLogGroup.Properties.LogGroupName,
    "/thingy-xyz/web-access",
  );
  assert.equal(resources.AccessLogGroup.Properties.RetentionInDays, 14);
  const fields = resources.AccessLogDelivery.Properties.RecordFields;
  for (const field of ["c-ip", "cs-uri-query", "cs(Cookie)", "cs(Referer)"])
    assert.ok(!fields.includes(field), field);
});

test("only main of this repository can assume the deployment role", () => {
  const trust =
    delivery.Resources.DeploymentRole.Properties.AssumeRolePolicyDocument
      .Statement[0];
  assert.equal(
    trust.Condition.StringEquals["token.actions.githubusercontent.com:sub"],
    "repo:jthingelstad@5351/thingy.thingelstad.xyz@1442336868:ref:refs/heads/main",
  );
  const actions =
    delivery.Resources.DeploymentRole.Properties.Policies[0].PolicyDocument.Statement.flatMap(
      (s: any) => s.Action,
    );
  assert.ok(
    !actions.includes("s3:DeleteObject"),
    "deploys never delete published files",
  );
});
