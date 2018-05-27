import * as vscode from 'vscode';

import {store} from '../store';

export async function addGithubToken() {
    const token = await vscode.window.showInputBox({password: true, prompt: 'Enter a valid github token:'});
    if (!token) {
        return;
    }

    store.githubToken = token;
    
    await vscode.workspace.getConfiguration("pullRequester").update("githubToken", token, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage('Github token has been saved.');
}