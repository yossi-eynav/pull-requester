'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DepNodeProvider } from './filesList';
import * as fs from 'fs-extra';
import {store} from './store';
import { sendReview } from './commands/sendReview';
import { showDiff } from './commands/showDiff';
import { viewPullInBrowser } from './commands/viewPullInBrowser';
import { selectPullRequest } from './commands/selectPullRequest';
import { addGithubToken } from './commands/addGithubToken';
import { addPullRequestComment } from './commands/addPullRequestComment';
import { readAllFileComments } from './commands/readAllFileComment';
import { provider } from './providers/commentsReviewer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    const token = await fs.readFile(`${process.env.HOME}/.githubtoken`);
    store.githubToken = token.toString();

    const registration = vscode.workspace.registerTextDocumentContentProvider('css-preview', provider);
    context.subscriptions.push(registration);
    vscode.commands.registerCommand('extension.readComments', readAllFileComments);

    vscode.commands.registerCommand('extension.sendPullRequestReview', sendReview);
    vscode.commands.registerCommand('extension.showDiff', showDiff);
    vscode.commands.registerCommand('extension.viewPull', viewPullInBrowser);
    vscode.commands.registerCommand('extension.selectPullRequest', async () => {
       const pullsFiles = await selectPullRequest();
       vscode.window.registerTreeDataProvider('nodeDependencies', new DepNodeProvider(pullsFiles));
    })

    vscode.commands.registerCommand('extension.addToken', addGithubToken);
    vscode.commands.registerCommand('extension.addComment', addPullRequestComment);
}

// this method is called when your extension is deactivated
export function deactivate() {
}