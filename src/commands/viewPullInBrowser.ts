import * as vscode from 'vscode';
import { store } from '../store';

export async function viewPullInBrowser(filename: string) {
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(store.currentPullRequest.html_url))
}