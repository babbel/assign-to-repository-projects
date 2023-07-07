import { Octokit } from '@octokit/core';
import fetchMock from 'fetch-mock'; // https://github.com/wheresrhys/fetch-mock

import { paginateGraphql } from '@octokit/plugin-paginate-graphql';
import { ApiWrapper } from '../apiwrapper';

const GraphQlOctokit = Octokit.plugin(paginateGraphql);
const octokit = new GraphQlOctokit({ auth: 'fake-token-value' }); // don't use default GITHUB_TOKEN token from env

const apiWrapper = new ApiWrapper({ octokit });

const mockResponse = (name, data) => {
  fetchMock.postOnce({
    name,
    matcher: 'https://api.github.com/graphql',
    response: {
      status: 200,
      body: { data },
    },
  });
};

describe('ApiWrapper', () => {
  afterAll(() => {
    fetchMock.reset();
  });

});
