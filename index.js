const CircleCI = require("@circleci/circleci-config-sdk");
const fs = require('fs');

const config = new CircleCI.Config();

// Node executor
const dockerNode = new CircleCI.executors
  .DockerExecutor("cimg/node:lts")
  .toReusable("docker-node");
config.addReusableExecutor(dockerNode);

// Test Job
const testJob = new CircleCI.Job("test", dockerNode.reuse());
testJob.addStep(new CircleCI.commands.Checkout());
testJob.addStep(new CircleCI.commands.Run({ command: "npm install && npm run test" }));
config.addJob(testJob);

//Deploy Job
const deployJob = new CircleCI.Job("deploy", dockerNode.reuse());
deployJob.addStep(new CircleCI.commands.Checkout());
deployJob.addStep(new CircleCI.commands.Run({ command: "npm run deploy" }));
config.addJob(deployJob);

// Workflow
const nodeWorkflow = new CircleCI.Workflow("node-test-deploy");
config.addWorkflow(nodeWorkflow);

nodeWorkflow.addJob(testJob);
const wfDeployJob = new CircleCI.workflow.WorkflowJob(deployJob, {
  requires: ["test"], filters: { branches: { ignore: [".*"] } }
});
nodeWorkflow.jobs.push(wfDeployJob);

/**
 * Exports a CircleCI config for a node project
 */
exports.writeNodeConfig = function (deployTag, configPath) {
  wfDeployJob.parameters.filters.tags = { only: deployTag }
  fs.writeFile(configPath, config.stringify(), (err) => {
    if (err) console.error(err);
  })
}
