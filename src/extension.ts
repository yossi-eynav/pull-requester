'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import { DepNodeProvider } from './filesList';
import * as hostedGitInfo from 'hosted-git-info'
import fetch from 'node-fetch'
import * as fs from 'fs-extra';
import { start } from 'repl';
import { STATUS_CODES, get } from 'http';
import * as diffParse from 'parse-diff';

const store = {
    currentPullRequest: {},
    pullRequestDiff: '',
    comments: []
};

function execute({cmd, cwd = vscode.workspace.rootPath}) {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd}, (err,stdout, stderr) => {
            if(err) {
                reject(err)
            } else {
                resolve(stdout.trim())
            }
        })

    })
}

// As a mitigation for extensions like ESLint showing warnings and errors
// for git URIs, let's change the file extension of these uris to .git,
// when `replaceFileExtension` is true.

// taken from https://github.com/Microsoft/vscode/blob/2d1e25598aa4d60ecdd1e8321d2495ddab158be2/extensions/git/src/uri.ts
function toGitUri(uri: vscode.Uri, ref: string, options = {}): vscode.Uri {
	const params = {
		path: uri.fsPath,
		ref
    };

	let path = uri.path;
    path = `${path}.git`;

	return uri.with({
		scheme: 'git',
		path,
		query: JSON.stringify(params)
	});
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const pullsRequesterChannel = vscode.window.createOutputChannel('pull-requester')

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "pull-requester" is now active!');

    vscode.commands.registerCommand('extension.sendPullRequestReview', async () => {
        const msgBody = await vscode.window.showInputBox({placeHolder: 'Enter your messsage:'})
        if(!msgBody) { return; }

        const answer = await vscode.window.showQuickPick(['APPROVE', 'REQUEST_CHANGES', 'COMMENT'], { placeHolder: 'What is the status of the review?' })
        if(!answer) { return; }

        const token = await getToken();

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
    });

    vscode.commands.registerCommand('extension.showDiff', async (filename) => {
        const originalFilePath = vscode.workspace.rootPath + '/' +filename;
        var setting1: vscode.Uri = vscode.Uri.parse("file:" + originalFilePath);
        const isExists = fs.pathExists(originalFilePath);

        var setting2: vscode.Uri = isExists ? vscode.Uri.parse(`file:/tmp/${filename}`) : vscode.Uri.parse(`file:/tmp/blank`) ;
        vscode.commands.executeCommand('vscode.diff', setting1, setting2, filename)
    });

    vscode.commands.registerCommand('extension.viewPull', async (filename) => {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(store.currentPullRequest.html_url))
    });

    vscode.commands.registerCommand('extension.selectPullRequest', async () => {
        await execute({cmd: 'touch /tmp/empty'});
        await execute({cmd: 'git fetch'});
        const token = await getToken();
        const origin = await execute({cmd: 'git remote get-url origin'})
        const info = hostedGitInfo.fromUrl(origin, {noGitPlus: true})
        const pullsRequest = await fetch(`https://api.github.com/repos/${info.user}/${info.project}/pulls?access_token=${token}`)
        const pulls = await pullsRequest.json()
        const options = pulls.map(pull => `[${pull.id}] - ${pull.title} by @${pull.user.login}`)
        const result = await vscode.window.showQuickPick(options)

        const chosenPullIndex = options.findIndex((option) => option === result)
        store.currentPullRequest = pulls[chosenPullIndex];
        await execute({cmd: `git checkout ${pulls[chosenPullIndex].base.sha}`})
        pullsRequesterChannel.appendLine(`a PR has been selected -> ${pulls[chosenPullIndex].name}`)

        const pullsRequestDiffRequest = await fetch(`https://api.github.com/repos/${info.user}/${info.project}/pulls/${pulls[chosenPullIndex].number}?access_token=${token}`,{headers: {
            'accept': 'application/vnd.github.v3.diff'
        }})
        store.pullRequestDiff = await pullsRequestDiffRequest.text()

        const pullsFilesRequest = await fetch(`https://api.github.com/repos/${info.user}/${info.project}/pulls/${pulls[chosenPullIndex].number}/files?access_token=${token}`)
        const pullsFiles = await pullsFilesRequest.json()

        console.log(pulls, result,chosenPullIndex,  pullsFiles);

        for(let file of pullsFiles){
            await saveFile(file);
        }

        async function saveFile(file) {
            const token = await getToken();
            const fileRequest = await fetch(file.contents_url + `&access_token=${token}`).then((r) => r.json()).then((r) => r.content)
            await fs.outputFile(`/tmp/${file.filename}`, Buffer.from(fileRequest, 'base64'))
        }
    //    vscode.TextEditor.act

    //
        vscode.window.registerTreeDataProvider('nodeDependencies', new DepNodeProvider(pullsFiles));
        // vscode.commands.executeCommand('vscode.open', setting1)
    })

    vscode.commands.registerCommand('extension.createPendingReview', async () => {
        const token = await getToken();
        const body = {
            "commit_id": store.currentPullRequest.head.sha,
            "comments": []
          };
        const response = await fetch(
            `${store.currentPullRequest.base.repo.url}/pulls/${store.currentPullRequest.number}/reviews?access_token=${token}`
        , {method: 'post',
        body: JSON.stringify(body)})

        const responseBody = await response.text();
        // POST /repos/:owner/:repo/pulls/:number/comments
        // POST /repos/:owner/:repo/pulls/:number/reviews

        console.dir(body)
        console.log(response.status, responseBody)

    });

    vscode.commands.registerCommand('extension.addToken', async () => {
        const token = await vscode.window.showInputBox({password: true, prompt: 'Enter a valid github token:'})
        await fs.outputFile(`${context.storagePath}/token`, token);

        vscode.window.showInformationMessage('Github token has been saved.');
    });

    vscode.commands.registerCommand('extension.addComment', async (...args) => {

        const editor = vscode.window.activeTextEditor;
        
        let text: string;

        if (editor) {
            const commentBody = await vscode.window.showInputBox({prompt: 'Add your comment.'})
            if(!commentBody) { return;  }
            let line = editor.selection.active.line;
            const lineText = editor.document.lineAt(line).text;
            const fileName = editor.document.uri.path.replace('/tmp/', '');

            // const fileIndex = store.pullRequestDiff.indexOf(fileName);

            const files = diffParse(store.pullRequestDiff);
            const file = files[files.findIndex(f => f.to === fileName)];

            const lines = [];
            file.chunks.forEach(function({changes}) {
                changes.forEach(change => {
                    lines.push(change.content);
                });
            });

            const token = await getToken();

            let lineNumber;
            for (let i = 0; i< lines.length; i++) {
                if(lines[i].includes(lineText)) {
                    lineNumber =  i + 1;
                }
            }

            const body = {
                commit_id: store.currentPullRequest.head.sha,
                path: fileName,
                position:lineNumber,
                body: commentBody
              };
            const response = await fetch(
                `${store.currentPullRequest.base.repo.url}/pulls/${store.currentPullRequest.number}/comments?access_token=${token}`
            , {method: 'post',
            body: JSON.stringify(body)})

            if(response.ok) {
                vscode.window.showInformationMessage('Comment has been created.');
            } else {
                vscode.window.showErrorMessage('Comment couldn\'t created.')
            }
        }
    });

    async function getToken() {
        const token = await fs.readFile(context.storagePath+ '/token');
        return token.toString();
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}