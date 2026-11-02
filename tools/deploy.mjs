// Publish dist/ to the site bucket and refresh CloudFront. Runs only in the
// GitHub deploy job, as the delivery role, for the current head of main.
//
// Nothing is ever deleted: older character versions and hashed bundles stay
// published for the pages and sites that still reference them.
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  waitUntilInvalidationCompleted,
} from "@aws-sdk/client-cloudfront";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { prepareObject, publicationOrder } from "./delivery-plan.mjs";

const REPOSITORY = "jthingelstad/thingy.thingelstad.xyz";
const config = JSON.parse(await fs.readFile("infra/deployment.json", "utf8"));
if (
  process.env.GITHUB_REPOSITORY !== REPOSITORY ||
  process.env.GITHUB_REF !== "refs/heads/main" ||
  !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || "")
)
  throw new Error("Only this repository's main branch publishes");
if (!config.distributionId || !config.deploymentRoleArn || !config.siteBucket)
  throw new Error(
    "infra/deployment.json is incomplete; run npm run infra:apply first",
  );
const settings = { region: config.region, maxAttempts: 5 };
const identity = await new STSClient(settings).send(
  new GetCallerIdentityCommand({}),
);
const expectedRole = config.deploymentRoleArn.split("/").at(-1);
if (
  identity.Account !== config.account ||
  !identity.Arn.includes(`:assumed-role/${expectedRole}/`)
)
  throw new Error("Unexpected deployment identity");

async function assertCurrentHead() {
  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY}/git/ref/heads/main`,
    {
      headers: {
        authorization: `Bearer ${process.env.GH_TOKEN}`,
        accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (
    !response.ok ||
    (await response.json()).object.sha !== process.env.GITHUB_SHA
  )
    throw new Error("Refusing to publish a superseded main revision");
}
await assertCurrentHead();
const revision = JSON.parse(await fs.readFile("dist/revision.json", "utf8"));
if (revision.commit !== process.env.GITHUB_SHA)
  throw new Error("Build does not match this commit");

async function files(folder) {
  const result = [];
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const name = path.join(folder, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Symlink in publication output: ${name}`);
    if (entry.isDirectory()) result.push(...(await files(name)));
    else result.push(path.relative("dist", name).split(path.sep).join("/"));
  }
  return result;
}

const s3 = new S3Client(settings);
const cdn = new CloudFrontClient(settings);
let uploaded = 0;
let unchanged = 0;
async function upload(key) {
  const object = prepareObject(key, await fs.readFile(path.join("dist", key)));
  try {
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: config.siteBucket, Key: key }),
    );
    if (
      head.Metadata?.sha256 === object.Metadata.sha256 &&
      head.ContentType === object.ContentType &&
      head.CacheControl === object.CacheControl &&
      !head.ContentEncoding
    ) {
      unchanged++;
      return;
    }
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) throw error;
  }
  await s3.send(
    new PutObjectCommand({ Bucket: config.siteBucket, Key: key, ...object }),
  );
  uploaded++;
}

// Assets and scripts first, then pages, then the revision marker, so a page
// never points at a file that is not there yet.
const ordered = publicationOrder(await files("dist"));
for (const group of [
  ordered.filter((k) => !k.endsWith(".html") && k !== "revision.json"),
  ordered.filter((k) => k.endsWith(".html")),
  ["revision.json"],
]) {
  await assertCurrentHead();
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < group.length) await upload(group[next++]);
    }),
  );
}

const invalidation = await cdn.send(
  new CreateInvalidationCommand({
    DistributionId: config.distributionId,
    InvalidationBatch: {
      CallerReference: `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,
      Paths: { Quantity: 1, Items: ["/*"] },
    },
  }),
);
await waitUntilInvalidationCompleted(
  { client: cdn, maxWaitTime: 900, minDelay: 10 },
  { DistributionId: config.distributionId, Id: invalidation.Invalidation.Id },
);

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const [route, file] of [
  ["/", "index.html"],
  ["/embed/", "embed/index.html"],
  ["/thingy.js", "thingy.js"],
  ["/revision.json", "revision.json"],
]) {
  const response = await fetch(new URL(route, config.productionUrl), {
    signal: AbortSignal.timeout(30000),
  });
  const delivered = Buffer.from(await response.arrayBuffer());
  if (
    !response.ok ||
    sha(delivered) !== sha(await fs.readFile(path.join("dist", file)))
  )
    throw new Error(`Published bytes differ: ${route} (${response.status})`);
}
const missing = await fetch(new URL("/no-such-page/", config.productionUrl));
if (missing.status !== 404 || !(await missing.text()).includes("Thingy"))
  throw new Error(`The 404 page is not served (${missing.status})`);

console.log(
  JSON.stringify({
    commit: process.env.GITHUB_SHA,
    uploaded,
    unchanged,
    url: config.productionUrl,
    invalidation: invalidation.Invalidation.Id,
  }),
);
