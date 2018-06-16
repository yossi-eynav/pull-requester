import * as vscode from 'vscode';
import { store } from '../store';
import fetch from 'node-fetch';

export async function sendReview() {
    const token = store.githubToken
    if(!token) {
        vscode.window.showErrorMessage('You must insert github token before running this command');
        return;
    }

    const msgBody = await vscode.window.showInputBox({placeHolder: 'Enter your message:'});
    if(!msgBody) { return; }

    const answer = await vscode.window.showQuickPick(['APPROVE', 'REQUEST_CHANGES', 'COMMENT'], { placeHolder: 'What is the status of the review?' })
    if(!answer) { return; }

    const body = {
        "commit_id": store.currentPullRequest.head.sha,
        "body": msgBody,
        "event": answer,
        "comments": []
      };
    const response = await fetch(
        `${store.currentPullRequest.base.repo.url}/pulls/${store.currentPullRequest.number}/reviews?access_token=${token}`
    , {method: 'post',
    body: JSON.stringify(body)})

    if(response.ok) {
        vscode.window.showInformationMessage('Your review submitted');
    } else {
        vscode.window.showErrorMessage('An error occurred');
    }
}