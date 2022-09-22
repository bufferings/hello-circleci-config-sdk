const CircleCI = require("@circleci/circleci-config-sdk");
const fs = require('fs');

const nodeConfig = new CircleCI.Config();

// Node executor
const dockerNode = new CircleCI.executors
  .DockerExecutor("cimg/node:lts")
  .toReusable("docker-node");
nodeConfig.addReusableExecutor(dockerNode);

// Test Job
const testJob = new CircleCI.Job("test", dockerNode.reuse());
testJob.addStep(new CircleCI.commands.Checkout());
testJob.addStep(new CircleCI.commands.Run({ command: "npm install && npm run test" }));
nodeConfig.addJob(testJob);

// Deploy Job
const deployJob = new CircleCI.Job("deploy", dockerNode.reuse());
deployJob.addStep(new CircleCI.commands.Checkout());
deployJob.addStep(new CircleCI.commands.Run({ command: "npm run deploy" }));
nodeConfig.addJob(deployJob);

// Workflow
const nodeWorkflow = new CircleCI.Workflow("node-test-deploy");
nodeConfig.addWorkflow(nodeWorkflow);

const wfTestJob = new CircleCI.workflow.WorkflowJob(testJob);
nodeWorkflow.jobs.push(wfTestJob);
const wfDeployJob = new CircleCI.workflow.WorkflowJob(deployJob, {
  requires: ["test"], filters: { branches: { ignore: ["/.*/"] } }
});
nodeWorkflow.jobs.push(wfDeployJob);

/**
 * Exports a CircleCI config for a node project
 */
module.exports = function writeNodeConfig(deployTag, configPath) {
  wfTestJob.parameters = {
    ...wfTestJob.parameters, filters: { tags: { only: deployTag } }
  };
  wfDeployJob.parameters.filters.tags = { only: deployTag };
  fs.writeFile(configPath, nodeConfig.stringify(), (err) => {
    if (err) console.error(err);
  })
}
