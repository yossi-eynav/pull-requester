import * as vscode from 'vscode';
import { store } from '../store';
import { execute } from '../utils';

export async function setLocalBranchAsBase() {
    try {
        await execute({cmd: 'git fetch'});
        await execute({cmd: `git checkout ${store.currentPullRequest.base.sha}`});
        vscode.window.showInformationMessage('Your local branch is pointing to the PR\'s base');
    } catch(e) {
        vscode.window.showErrorMessage(e.message);
    }
}

export async function setLocalBranchAsRemote() {
    try {
        await execute({cmd: 'git fetch'});
        await execute({cmd: `git checkout ${store.currentPullRequest.head.sha}`});
        vscode.window.showInformationMessage('Your local branch is pointing to the PR\'s head');
    } catch(e) {
        vscode.window.showErrorMessage(e.message);
    }
}