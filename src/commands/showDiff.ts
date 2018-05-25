import * as vscode from 'vscode';
import { store } from '../store';
import fetch from 'node-fetch';
import * as fs from 'fs-extra';

export async function showDiff(filename: string) {
    const originalFilePath = vscode.workspace.rootPath + '/' +filename;
    const isExists = await fs.pathExists(originalFilePath);

    var setting1: vscode.Uri = isExists ? vscode.Uri.parse("file:" + originalFilePath) :  vscode.Uri.parse(`file:/tmp/empty`);
    var setting2: vscode.Uri = vscode.Uri.parse(`file:/tmp/${filename}`);

    vscode.commands.executeCommand('vscode.diff', setting1, setting2, filename)
}