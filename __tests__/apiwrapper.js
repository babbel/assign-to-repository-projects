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

  describe('.fetchRepositoryAndProjects()', () => {
    const data = {
      repository: {
        name: 'example-repository',
        id: 'R_0000000001',
        projectsV2: {
          nodes: [
            {
              id: 'PVT_kwDOAnsQgs4AP9Qq',
              title: 'layer-200/module-1',
            },
            {
              id: 'PVT_000000000000002',
              title: 'layer-100/module-2',
            },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: 'Nw',
          },
        },
      },
    };

    const input = {
      owner: 'acme',
      repositoryName: 'example-repository-name',
    };

    beforeEach(() => { mockResponse('fetchRepositoryAndProjects', data); });
    afterEach(() => { fetchMock.reset(); });

    test('returns object containing id', async () => {
      const repository = await apiWrapper.fetchRepositoryAndProjects(input);
      expect({ repository }).toEqual(data); // checks deep
    });
  });
});
