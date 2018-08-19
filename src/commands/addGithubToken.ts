import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { store } from '../store';

export async function addGithubToken() {
    const token = await vscode.window.showInputBox({password: true, prompt: 'Enter a valid github token:'})
    if (!token) { return; }

    const homedir = require('os').homedir();

    await vscode.workspace.getConfiguration("pullRequester").update("githubToken", token, vscode.ConfigurationTarget.Global);
    await fs.outputFile(`${homedir}/.githubtoken`, token);
    store.githubToken = token;
    vscode.window.showInformationMessage('Github token has been saved.');
}