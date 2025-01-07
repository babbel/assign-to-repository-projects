import { jest } from "@jest/globals"; // eslint-disable-line import/no-extraneous-dependencies

import { ApiWrapper } from "../apiwrapper";
import { RepositoryProjectsManager } from "../projects.js"; // eslint-disable-line import/extensions

describe("RepositoryProjectsManager.assing() posts requests to the API", () => {
  let rpm;

  beforeEach(() => {
    const apiWrapper = new ApiWrapper({ octokit: null });

    jest
      .spyOn(apiWrapper, "fetchRepositoryAndProjects")
      .mockImplementation(() => ({
        repository: {
          name: "example-repository",
          id: "R_0000000001",
          projectsV2: {
            nodes: [
              {
                id: "PVT_0000000000000001",
                title: "layer-100/bar",
                number: 1099,
                fields: {
                  nodes: [
                    {},
                    {},
                    {
                      id: "PVTSSF_00000000000000000000001",
                      name: "Status",
                      options: [
                        {
                          id: "00000001",
                          name: "Todo",
                        },
                        {
                          id: "00000002",
                          name: "In Progress",
                        },
                        {
                          id: "00000003",
                          name: "Done",
                        },
                      ],
                    },
                    {},
                    {},
                  ],
                },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: "Nw",
            },
          },
        },
      }));

    jest
      .spyOn(apiWrapper, "fetchRepositoryAndProjects")
      .mockImplementationOnce(() => ({
        name: "example-repository",
        id: "R_0000000001",
        projectsV2: {
          nodes: [
            {
              id: "PVT_000000000000002",
              title: "layer-100/module-2",
            },
          ],
        },
      }))
      .mockImplementationOnce(() => ({
        name: "example-repository",
        id: "R_0000000001",
        projectsV2: {
          nodes: [
            {
              id: "PVT_000000000000001",
              title: "layer-200/module-1",
            },
            {
              id: "PVT_000000000000002",
              title: "layer-100/module-2",
            },
          ],
        },
      }));

    jest
      .spyOn(apiWrapper, "fetchItemForPRId")
      .mockImplementation(() => "PVT_0000000000000001");

    jest
      .spyOn(apiWrapper, "fetchAssignedProjects")
      .mockImplementationOnce(() => [
        {
          id: "PVT_0000000000000001",
          title: "layer-100/bar",
        },
      ])
      .mockImplementationOnce(() => [
        {
          id: "PVT_0000000000000001",
          title: "layer-100/bar",
        },
      ]);

    rpm = new RepositoryProjectsManager({
      apiWrapper,
      ownerName: "acme",
      repositoryName: "example-repository",
    });
  });

  // setup and requests are identical fore example for assigning the PR to a new project because
  // addProjectV2ItemById and updateProjectV2ItemFieldValue are idempotent.
  test("when the PR is already assigned to a project", async () => {
    const titles = ["layer-100/bar"];

    const pullRequestNumber = "PR_0000000000000001";

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });
});

describe("RepositoryProjectsManager.assing() posts requests to the API", () => {
  let rpm;

  beforeEach(() => {
    const apiWrapper = new ApiWrapper({ octokit: null });

    jest
      .spyOn(apiWrapper, "fetchRepositoryAndProjects")
      .mockImplementation(() => ({
        repository: {
          name: "example-repository",
          id: "R_0000000001",
          projectsV2: {
            nodes: [
              {
                id: "PVT_0000000000000001",
                title: "layer-100/bar",
                number: 1099,
                fields: {
                  nodes: [
                    {},
                    {},
                    {
                      id: "PVTSSF_00000000000000000000001",
                      name: "Status",
                      options: [
                        {
                          id: "00000001",
                          name: "Todo",
                        },
                        {
                          id: "00000002",
                          name: "In Progress",
                        },
                        {
                          id: "00000003",
                          name: "Done",
                        },
                      ],
                    },
                    {},
                    {},
                  ],
                },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              endCursor: "Nw",
            },
          },
        },
      }));

    jest
      .spyOn(apiWrapper, "fetchRepositoryAndProjects")
      .mockImplementationOnce(() => ({
        name: "example-repository",
        id: "R_0000000001",
        projectsV2: {
          nodes: [
            {
              id: "PVT_000000000000001",
              title: "layer-100/bar-1",
            },
          ],
        },
      }));

    jest.spyOn(apiWrapper, "fetchItemForPRId").mockImplementation(() => ({
      updateProjectV2ItemFieldValue: {
        projectV2Item: {
          id: "PVTI_0000000000000001",
        },
      },
    }));

    jest
      .spyOn(apiWrapper, "fetchItemForPRId")
      .mockImplementation(() => "PVTI_0000000000000001");

    jest
      .spyOn(apiWrapper, "fetchAssignedProjects")
      .mockImplementationOnce(() => [
        {
          id: "PVT_0000000000000001",
          title: "layer-100/bar",
        },
      ])
      .mockImplementationOnce(() => []);

    jest.spyOn(apiWrapper, "deleteProjectItem").mockImplementation(() => ({
      deleteProjectV2Item: { deletedItemId: "PVTI_00000000000000000000000" },
    }));

    rpm = new RepositoryProjectsManager({
      apiWrapper,
      ownerName: "acme",
      repositoryName: "example-repository",
    });
  });

  test("when the PR is assigend to one project but should not be assigned to any project", async () => {
    const titles = [];

    const pullRequestNumber = "PR_0000000000000001";

    const outputProjects = await rpm.assign(pullRequestNumber, titles);
    const outputTitles = outputProjects.map((p) => p.title);

    expect(outputTitles).toEqual(titles);
  });
});
