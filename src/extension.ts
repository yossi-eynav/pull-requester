'use strict';
import * as vscode from 'vscode';
import { PrFileProvider } from './filesList';
import { sendReview } from './commands/sendReview';
import { showDiff } from './commands/showDiff';
import { viewPullInBrowser } from './commands/viewPullInBrowser';
import { selectPullRequest } from './commands/selectPullRequest';
import { addGithubToken } from './commands/addGithubToken';
import { addPullRequestComment } from './commands/addPullRequestComment';
import { readAllFileComments } from './commands/readAllFileComment';
import { store, resetStore } from './store';
import { provider } from './providers/commentsReviewer';
import { setLocalBranchAsRemote, setLocalBranchAsBase } from './commands/setLocalBranch';

export async function activate(context: vscode.ExtensionContext) {
    const pullRequestFilesProvider = new PrFileProvider();
    let statusDisposable: vscode.Disposable;
    const disposable = vscode.workspace.registerTextDocumentContentProvider('pr-comment-preview', provider);
    const treeDisposable = vscode.window.registerTreeDataProvider('pullRequesterFiles', pullRequestFilesProvider);
    
    context.subscriptions.push(treeDisposable, disposable);

    vscode.commands.registerCommand('pullRequester.readComments', readAllFileComments);
    vscode.commands.registerCommand('pullRequester.sendPullRequestReview', sendReview);
    vscode.commands.registerCommand('pullRequester.showDiff', showDiff);
    vscode.commands.registerCommand('pullRequester.viewPull', viewPullInBrowser);
    vscode.commands.registerCommand('pullRequester.selectPullRequest', async () => {
        await vscode.commands.executeCommand('pullRequester.reset');
        try {
            await selectPullRequest();
            pullRequestFilesProvider.refresh();
            const selectedPull = store.currentPullRequest;
            statusDisposable =  vscode.window.setStatusBarMessage(`Review in progress: ${selectedPull.title} by @${selectedPull.user.login}`)
            context.subscriptions.push(statusDisposable);
        } catch(e) {
            vscode.window.showErrorMessage(e.message);
        }
    });

    vscode.commands.registerCommand('pullRequester.addToken', addGithubToken);
    vscode.commands.registerCommand('pullRequester.addComment', addPullRequestComment);
    vscode.commands.registerCommand('pullRequester.localBranchAsRemote', setLocalBranchAsRemote);
    vscode.commands.registerCommand('pullRequester.localBranchAsBase', setLocalBranchAsBase);

    vscode.commands.registerCommand('pullRequester.reset', () => {
        resetStore();
        if(statusDisposable) { statusDisposable.dispose(); }
        pullRequestFilesProvider.refresh();
    });
}

export function deactivate() {
}