import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { store } from '../store';

export async function showDiff(filename: string) {
    const originalFilePath = `/tmp/${store.currentPullRequest.base.sha}/${filename}`;
    const isExists = await fs.pathExists(originalFilePath);

    var setting1: vscode.Uri = isExists ? vscode.Uri.parse(`file:${originalFilePath}`) :  vscode.Uri.parse(`file:/tmp/empty`);
    var setting2: vscode.Uri = vscode.Uri.parse(`file:/tmp/${filename}`);

    vscode.commands.executeCommand('vscode.diff', setting1, setting2, filename)
}