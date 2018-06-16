import * as vscode from 'vscode';

let store: Store = createStore();

interface Store {
    currentPullRequest: any;
    pullRequestDiff: any;
    comments: Array<any>;
    githubToken: string;
    currentPRFiles: Array<any>;
}

function createStore() {
    let token = '';
    try {
        token = vscode.workspace.getConfiguration("pullRequester").get("githubToken") as string;
    } catch(e){
        console.error(e);
    }
    
    return {
        currentPullRequest: {},
        pullRequestDiff: '',
        comments: [],
        currentPRFiles: [],
        githubToken: token
    };
}

export function resetStore() {
    store = createStore();
}

export {
    store,
    createStore,
    Store
}