// Create or update the site's CloudFormation stacks through change sets.
//
//   node tools/infra.mjs plan    create change sets, print them, execute nothing
//   node tools/infra.mjs apply   execute the change sets, site first, then delivery
//
// Run as the cloud-engineer identity in us-east-1. The site stack owns the
// certificate (validated through its own record in the thingelstad.xyz zone),
// the private bucket, the distribution, the A and AAAA alias records, the
// access log. The delivery stack owns the GitHub OIDC role
// that publishes main. Each apply rewrites infra/deployment.json from the live
// stack outputs. Infrastructure never changes through the delivery role.
import {
  CloudFormationClient,
  CreateChangeSetCommand,
  DeleteChangeSetCommand,
  DescribeChangeSetCommand,
  DescribeStacksCommand,
  ExecuteChangeSetCommand,
  waitUntilChangeSetCreateComplete,
  waitUntilStackCreateComplete,
  waitUntilStackUpdateComplete,
} from "@aws-sdk/client-cloudformation";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import fs from "node:fs/promises";

const mode = process.argv[2];
if (!["plan", "apply"].includes(mode))
  throw new Error("Usage: node tools/infra.mjs plan|apply");
const config = JSON.parse(await fs.readFile("infra/deployment.json", "utf8"));
const settings = { region: config.region, maxAttempts: 5 };
const identity = await new STSClient(settings).send(
  new GetCallerIdentityCommand({}),
);
if (identity.Account !== config.account)
  throw new Error(`Unexpected AWS account ${identity.Account}`);
console.log(`Identity ${identity.Arn}`);
const cfn = new CloudFormationClient(settings);
const Tags = Object.entries(config.stackTags).map(([Key, Value]) => ({
  Key,
  Value,
}));

async function stack(name) {
  try {
    const { Stacks } = await cfn.send(
      new DescribeStacksCommand({ StackName: name }),
    );
    // A CREATE change set left by `plan` parks a new stack in
    // REVIEW_IN_PROGRESS; it still takes a CREATE change set.
    if (Stacks[0].StackStatus === "REVIEW_IN_PROGRESS") return undefined;
    return Stacks[0];
  } catch (error) {
    if (/does not exist/.test(error.message)) return undefined;
    throw error;
  }
}
const outputs = (s) =>
  Object.fromEntries(
    (s?.Outputs || []).map((o) => [o.OutputKey, o.OutputValue]),
  );

async function converge(name, file, parameters = {}, capabilities = []) {
  const existing = await stack(name);
  const type = existing ? "UPDATE" : "CREATE";
  const ChangeSetName = `${mode}-${Date.now()}`;
  await cfn.send(
    new CreateChangeSetCommand({
      StackName: name,
      ChangeSetName,
      ChangeSetType: type,
      TemplateBody: await fs.readFile(`infra/${file}.json`, "utf8"),
      Parameters: Object.entries(parameters).map(
        ([ParameterKey, ParameterValue]) => ({ ParameterKey, ParameterValue }),
      ),
      Capabilities: capabilities,
      Tags,
    }),
  );
  try {
    await waitUntilChangeSetCreateComplete(
      { client: cfn, maxWaitTime: 300 },
      { StackName: name, ChangeSetName },
    );
  } catch (error) {
    const { StatusReason } = await cfn.send(
      new DescribeChangeSetCommand({ StackName: name, ChangeSetName }),
    );
    if (
      /didn't contain changes|No updates are to be performed/.test(
        StatusReason || "",
      )
    ) {
      console.log(`${name}: no changes`);
      await cfn.send(
        new DeleteChangeSetCommand({ StackName: name, ChangeSetName }),
      );
      return existing;
    }
    throw new Error(`${name}: ${StatusReason || error.message}`, {
      cause: error,
    });
  }
  const { Changes } = await cfn.send(
    new DescribeChangeSetCommand({ StackName: name, ChangeSetName }),
  );
  console.log(`${name} (${type}):`);
  for (const c of Changes)
    console.log(
      `  ${c.ResourceChange.Action} ${c.ResourceChange.LogicalResourceId} ${c.ResourceChange.ResourceType}${c.ResourceChange.Replacement === "True" ? " (REPLACEMENT)" : ""}`,
    );
  if (mode === "plan") return existing;
  await cfn.send(
    new ExecuteChangeSetCommand({ StackName: name, ChangeSetName }),
  );
  const wait =
    type === "CREATE"
      ? waitUntilStackCreateComplete
      : waitUntilStackUpdateComplete;
  // A new certificate waits for DNS validation inside the stack, and a new
  // distribution takes several minutes to deploy.
  await wait({ client: cfn, maxWaitTime: 3600 }, { StackName: name });
  return stack(name);
}

const site = outputs(await converge(config.stacks.site, "site"));
if (!site.DistributionId) {
  console.log("Plan only: the delivery stack waits for the site stack.");
  process.exit(0);
}
const delivery = outputs(
  await converge(
    config.stacks.delivery,
    "delivery",
    { SiteBucket: site.SiteBucket, DistributionId: site.DistributionId },
    ["CAPABILITY_IAM"],
  ),
);
if (mode === "apply") {
  const next = {
    ...config,
    siteBucket: site.SiteBucket,
    distributionId: site.DistributionId,
    cloudfrontDomain: site.DistributionDomain,
    certificateArn: site.CertificateArn,
    deploymentRoleArn: delivery.DeploymentRoleArn || null,
  };
  await fs.writeFile(
    "infra/deployment.json",
    JSON.stringify(next, null, 2) + "\n",
  );
  console.log("Wrote infra/deployment.json");
  if (delivery.DeploymentRoleArn)
    console.log(
      `GitHub repository variable AWS_DEPLOY_ROLE_ARN = ${delivery.DeploymentRoleArn}`,
    );
}
