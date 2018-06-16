import * as vscode from 'vscode';

const previewUri = vscode.Uri.parse('pr-comment-preview://authority/pr-comment-preview');

export async function readAllFileComments() {

    const editor = vscode.window.activeTextEditor;
    if (!editor) { return null;; }

    const path = editor.document.uri.path.replace('/tmp/', '');

	return await vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, `Comments on ${path}`).then((success) => {
    }, (reason) => {
        vscode.window.showErrorMessage(reason);
    });
}