'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DepNodeProvider } from './filesList';
import {store} from './store';
import { sendReview } from './commands/sendReview';
import { showDiff } from './commands/showDiff';
import { viewPullInBrowser } from './commands/viewPullInBrowser';
import { selectPullRequest } from './commands/selectPullRequest';
import { addGithubToken } from './commands/addGithubToken';
import { addPullRequestComment } from './commands/addPullRequestComment';
import { readAllFileComments } from './commands/readAllFileComment';
import { provider } from './providers/commentsReviewer';
import { StatusBar } from './statusBar';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    try {
        const token = vscode.workspace.getConfiguration("pullRequester").get("githubToken") as string;
        store.githubToken = token;
    } catch(e){
        console.error(e);
    }
    
    const registration = vscode.workspace.registerTextDocumentContentProvider('css-preview', provider);
    context.subscriptions.push(registration);
    vscode.commands.registerCommand('pullRequester.readComments', readAllFileComments);

    vscode.commands.registerCommand('pullRequester.sendPullRequestReview', sendReview);
    vscode.commands.registerCommand('pullRequester.showDiff', showDiff);
    vscode.commands.registerCommand('pullRequester.viewPull', viewPullInBrowser);
    vscode.commands.registerCommand('pullRequester.selectPullRequest', async () => {
        try {
            const pullsFiles = await selectPullRequest();
            vscode.window.registerTreeDataProvider('pullRequesterFiles', new DepNodeProvider(pullsFiles));
        } catch(e) {
            vscode.window.showErrorMessage(e.message);
        }

    })

    vscode.commands.registerCommand('pullRequester.addToken', addGithubToken);
    vscode.commands.registerCommand('pullRequester.addComment', addPullRequestComment);

    // create a new word counter
    const statusBar = new StatusBar();

    // add to a list of disposables which are disposed when this extension
    // is deactivated again.
    context.subscriptions.push(statusBar);
}

// this method is called when your extension is deactivated
export function deactivate() {
}