import * as vscode from 'vscode';
import { store } from '../store';
import * as escape from 'escape-html';
import fetch from 'node-fetch';

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    public async provideTextDocumentContent(uri: vscode.Uri) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return ''; }

        const file = editor.document.uri.path.replace('/tmp/', '');
        const token = store.githubToken;

        const commentsRequests = await fetch(store.currentPullRequest.url + `/comments?access_token=${token}`)
        const comments = await commentsRequests.json()
        
        return this.snippet(comments.filter(c => c.path === file));
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }

    private snippet(comments: any): string {
        
        return `
        <head>
        
        </head>
        <style>
      
       .body {
            font-size: 16px;
            line-height: 16px;
            padding: 7px;
            background-color: white;
            margin-bottom: 10px;
            color: black;
       }

       body {
        background-color: white;
        color: black;
       }

       .body span {
            white-space: nowrap;
       }

       .body strong {
           display: block;
       }

       .item {
           padding: 5px;
           border: 1px solid rgba(0,0,0,0.2);
           margin-bottom: 10px;
       }
            </style>
            <body>
                ${comments.map(c => {
                    let body = escape(c.diff_hunk);

                    return `<div class="item">
                        <pre><code>${body}</code></pre>
                        <p class="body">
                            <span>"${escape(c.body)}"</span>
                            <strong>@${c.user.login}</strong>
                        </p>
                    </div>`;
                })}
               
            </body>`;
    }
}

export const provider = new TextDocumentContentProvider();