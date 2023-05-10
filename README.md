# assign-to-repository-projects
Github Action assigning pull requests to GitHub projects of a repository.

## Context

This GitHub Action assigns a pull request to [GitHub projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) (aka Projects V2). The intended use case is, that a PR given by `pull_request` type GitHub action event should be assigned to one or more projects. The projects are give by a list of project titles. For each title, the PR is assigned to the matching project. After that the resulting project item's `Status` field value is set to `Todo`, additionally. (The field `Status` and the single select option `Todo` are created by default with any project by API and are assumed to exist.) The action is idempotent for GitHub projects given the same inputs.


## Requirements

This GitHub action expects an GitHub action event of type [push](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push).

Moreover, the GitHub token of a GitHub App installation is expected as environment variable `GITHUB_TOKEN`. The GitHub App requires the following permissions.

- Read access to administration and metadata
- Read and write access to code, organization projects and pull requests


## Inputs

| Name             | Description                                                                                     | Type         | Required? | Default |
|------------------|-------------------------------------------------------------------------------------------------|--------------|-----------|---------|
| `project-titles` | Space-separated list of titles of projects linked to this repository the PR will be assigned to | `string`     | YES       | ''      |


## Outputs

| Name             | Description                                                                               | Type    |
|------------------|-------------------------------------------------------------------------------------------|---------|
| `project-titles` | Space-separated list of titles of projects in this repository the PR has been assigned to | `string`|



## Build process

Instead of checking in `node_modules` for the [JavaScript action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action)
we are using [ncc](https://github.com/vercel/ncc). To build the project run `npm run build`.
