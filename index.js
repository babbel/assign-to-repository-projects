import core from '@actions/core';
import github from '@actions/github';

import { Octokit } from '@octokit/core'; // eslint-disable-line import/no-extraneous-dependencies
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';

import { ApiWrapper } from './apiwrapper.js'; // eslint-disable-line import/extensions
import { RepositoryProjectsManager } from './projects.js'; // eslint-disable-line import/extensions

const GraphQlOctokit = Octokit.plugin(paginateGraphQL);

// https://github.com/octokit/authentication-strategies.js
// example: https://github.com/octokit/graphql.js/issues/61#issuecomment-542399763
// for token type installation, pass only the token
const octokit = new GraphQlOctokit({ auth: process.env.GITHUB_TOKEN });
const apiWrapper = new ApiWrapper({ octokit });

const hasDuplicates = (array) => new Set(array).size !== array.length;

try {
  const titlesInput = core.getInput('project-titles');
  const titles = titlesInput.split(/\s+/);

  if (hasDuplicates(titles)) {
    throw new Error(`Duplicate project titles are not allowed: ${titles}`);
  }

  // requries a github action event of type pull_request
  const {
    context: {
      payload: {
        pull_request: {
          node_id, // eslint-disable-line camelcase
        },
        repository,
      },
    },
  } = github;

  const rpm = new RepositoryProjectsManager({
    apiWrapper,
    ownerName: repository.owner.login,
    repositoryName: repository.name,
  });

  const assignedProjectTitles = await rpm.assign(node_id, titles);

  core.setOutput('project-titles', assignedProjectTitles.map((p) => p.title).join(' '));
} catch (error) {
  core.setFailed(error.message);
}
