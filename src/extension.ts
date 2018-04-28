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

    vscode.commands.registerCommand('extension.showDiff', async (filename) => {

        var setting1: vscode.Uri = vscode.Uri.parse("file:" + vscode.workspace.rootPath + '/' +filename);
        // var setting1: vscode.Uri = vscode.Uri.parse(path);
        var setting2: vscode.Uri = vscode.Uri.parse(`file:/tmp/${filename}`);
        vscode.commands.executeCommand('vscode.diff', setting1, setting2, filename)

    });


    vscode.commands.registerCommand('extension.selectPullRequest', async () => {
        await execute({cmd: 'touch /tmp/empty'})
        await execute({cmd: 'git fetch'})
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

    vscode.commands.registerCommand('extension.submitComments', async () => {
        const comments = store.comments.map(c =>        
            {
                const fileIndex = store.pullRequestDiff.indexOf(c.fileName);
                let line = c.line;
                const matches = store.pullRequestDiff.slice(fileIndex).match(/@@ -([\d]+)/i)
                if(matches && matches[0]) {
                    line = line - parseInt(matches[1], 10)
                }

           return {
            path: c.fileName, 
            position:line,
            body: c.body
        }})
      


        const token = await getToken();

        const body = {
            "commit_id": store.currentPullRequest.head.sha,
            "body": "Test!",
            "event": "REQUEST_CHANGES",
            "comments": comments
            //   {
            //     "path": "file.md",
            //     "position": 6,
            //     "body": "Please add more information here, and fix this typo."
            //   }
            
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
    vscode.commands.registerCommand('extension.showDiffFromMaster', async () => {
        // const origin = await execute('git remote get-url origin')

        // exec(`git remote get-url origin`, { cwd: vscode.workspace.rootPath }, (err,stdout, stderr) => {
        //         .then(r => {
        //             const baseBranch = r.base.ref;
        //             const bsseSha =  r.base.sha;
        //             console.log(r);
        //         }).catch(e => {
        //             console.error(e)
        //         })


// info.user
// "yossi-eynav"
// info.name
// undefined
// info.project

            // console.log(stdout,info.project)
        })
        
        // var setting1: vscode.Uri = vscode.Uri.parse("file:" + vscode.workspace.rootPath + '/README.md');
        // var setting2: vscode.Uri = vscode.Uri.parse("file:" + vscode.workspace.rootPath + '/README.md');
        
    //    vscode.TextEditor.act
    
    // 
        // 
        // vscode.commands.executeCommand('vscode.open', setting1)
        // vscode.commands.executeCommand('vscode.diff', toGitUri(setting1, 'abde0d7ad693eb54d5a06868e1a4bd73adcb11f0'), setting2, 'Changes',     { preview: true, originalEditable: true }
    // )

        // function createResourceUri(relativePath: string): vscode.Uri {
        //     const absolutePath = path.join(vscode.workspace.rootPath || '', relativePath);
        //     return vscode.Uri.file(absolutePath);
        //   }
          
        //   const gitSCM = vscode.scm.createSourceControl('git', "Git");
        //   const index = gitSCM.createResourceGroup('index', "Index");
        //   index.resourceStates = [
        //     { resourceUri: createResourceUri('README.md') },
        //     // { resourceUri: createResourceUri('src/test/api.ts') }
        //   ];
          
        //   const workingTree = gitSCM.createResourceGroup('workingTree', "Changes");
        //   workingTree.resourceStates = [
        //     // { resourceUri: createResourceUri('.travis.yml') },
        //     { resourceUri: createResourceUri('README.md') }
        //   ];

    //     vscode.window.showInformationMessage('Hello World!');
    // });

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed
        // vscode.
        // Display a message box to the user
        // vscode.scm.
        vscode.window.showInformationMessage('Hello World!');
    });

    
    vscode.commands.registerCommand('extension.addToken', async () => {
        const token = await vscode.window.showInputBox({password: true, prompt: 'Enter a valid github token:'})
        await fs.outputFile(`${context.storagePath}/token`, token);

        vscode.window.showInformationMessage('Github token has been saved.');
    });

    vscode.commands.registerCommand('extension.deleteComment', async () => {
        const options = store.comments.map(c => `${c.body} in ${c.fileName}:${c.line}`);
        const answer = await vscode.window.showQuickPick(options)
        const index = options.findIndex(option => option === answer);
        
        store.comments.splice(index, 1);
    });

    vscode.commands.registerCommand('extension.printAllComments', async () => {
        pullsRequesterChannel.appendLine('All comments:')
        store.comments.forEach(c => {
            pullsRequesterChannel.appendLine(`
            #########################################################
            ${c.body}
            #########################################################
            in ${c.fileName}:${c.line}
            `)
        })
    })

    vscode.commands.registerCommand('extension.addComment', async (...args) => {

        const editor = vscode.window.activeTextEditor;
        let text: string;

        if (editor) {
            const commentBody = await vscode.window.showInputBox({prompt: 'Add your comment.'})
            let line = editor.selection.active.line + 1;
            const fileName = editor.document.uri.path.replace('/tmp/', '');


    
            const fileIndex = store.pullRequestDiff.indexOf(fileName);
            const matches = store.pullRequestDiff.slice(fileIndex).match(/@@ -([\d]+)/i)
            if(matches && matches[0]) {
                line = line - parseInt(matches[1], 10) +2
            }
    
            const token = await getToken();
    
            const body = {
                "commit_id": store.currentPullRequest.head.sha,
                path: fileName, 
                position: line,
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
    
            // store.comments.push({
            //     body: commentBody,
            //     line,
            //     fileName
            // });

            // const msg = `A new comment has need added in ${fileName}:${line}`
            // pullsRequesterChannel.appendLine(`New comment:
            // #########################################################
            // ${commentBody}
            // #########################################################
            // in ${fileName}:${line}
            // `)

            // vscode.scm.∏”
            // vscode.scm.inputBo
            // vscode.workspace.getConfiguration('GENERAL')
            // vscode.workspace.
            // vscode.window.showQuickPick({

            // })
        }

    
        // The code you place here will be executed every time your command is executed
        // vscode.
        // Display a message box to the user
        // vscode.scm.
        // vscode.window.showInformationMessage('Hello World!');

    });

    async function getToken() {
        const token = await fs.readFile(context.storagePath+ '/token');
        return token.toString();
    }
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}