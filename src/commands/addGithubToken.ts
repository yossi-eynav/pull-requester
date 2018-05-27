import * as vscode from 'vscode';
import * as fs from 'fs-extra';

export async function addGithubToken() {
    const token = await vscode.window.showInputBox({password: true, prompt: 'Enter a valid github token:'});
    await fs.outputFile(`${process.env.HOME}/.githubtoken`, token);

    vscode.window.showInformationMessage('Github token has been saved.');
}