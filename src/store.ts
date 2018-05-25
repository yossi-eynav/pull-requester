interface Store {
    currentPullRequest: any;
    pullRequestDiff: any;
    comments: Array<any>;
    githubToken: string;
}
export const store: Store = {
    currentPullRequest: {},
    pullRequestDiff: '',
    comments: [],
    githubToken: ''
};

