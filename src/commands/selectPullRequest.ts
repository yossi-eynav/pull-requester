import * as vscode from 'vscode';
import { store } from '../store';
import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import { execute } from '../utils';
import * as hostedGitInfo from 'hosted-git-info'
const URL = require('url-parse');

export async function selectPullRequest() {
    const token = store.githubToken;
    if(!token) {
        throw new Error('You must insert github token before running this command')
    }
    const origin = await execute({cmd: 'git remote get-url origin'});
    const info = hostedGitInfo.fromUrl(origin, {noGitPlus: true});
    const pullsRequest = await fetch(`https://api.github.com/repos/${info.user}/${info.project}/pulls?access_token=${token}`)
    const pulls = await pullsRequest.json()
    const options = pulls.map((pull: any) => `[${pull.id}] - ${pull.title} by @${pull.user.login}`)
    const result = await vscode.window.showQuickPick(options);
    const chosenPullIndex = options.findIndex((option: string) => option === result)
    if(chosenPullIndex === -1) { return; }
    
    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Setting your environment",
        cancellable: false
    }, async (progress, _) => {
        await fs.createFile('/tmp/empty');

        // progress.report({ increment: 0, message: "git fetch" });
        // await execute({cmd: 'git fetch'});

        // progress.report({ increment: 0, message: `git checkout ${selectedPull.base.sha}` });
        // await execute({cmd: `git checkout ${selectedPull.base.sha}`});

        const selectedPull = pulls[chosenPullIndex];
        store.currentPullRequest = selectedPull;

        progress.report({ increment: 10, message: `fetching from github.com the git patch` });
        const pullsRequestDiffRequest = await fetch(`https://api.github.com/repos/${info.user}/${info.project}/pulls/${selectedPull.number}?access_token=${token}`,{headers: {
            'accept': 'application/vnd.github.v3.diff'
        }})
        store.pullRequestDiff = await pullsRequestDiffRequest.text();

        progress.report({ increment: 10, message: `fetching from github.com the pull request's files` });
        const pullsFilesRequest = await fetch(`https://api.github.com/repos/${info.user}/${info.project}/pulls/${selectedPull.number}/files?access_token=${token}`)
        if(!pullsFilesRequest.ok) {  
            throw new Error('Couldn\'t fetch files')
        }

        let pullsFiles = await pullsFilesRequest.json();
        pullsFiles = pullsFiles.filter((file) => !file.filename.match(/\.(jpg|jpeg|mp4|gif|png)/gi));

        for(let file of pullsFiles){
            progress.report({ increment: (80 / pullsFiles.length), message: `downloading ${file.filename}...` });
            try {
                await saveFile(file);
                await saveBaseFile(file);
            } catch(e) {
                vscode.window.showErrorMessage(`Couldn't fetch ${file.filename}`);
            }
        }

        store.currentPRFiles = pullsFiles;
        return Promise.resolve(pullsFiles);

        async function saveFile(file: any) {
            const token = store.githubToken;
            const fileRequest = await fetch(file.contents_url + `&access_token=${token}`).then((r) => r.json()).then((r) => r.content)
            await fs.outputFile(`/tmp/${file.filename}`, Buffer.from(fileRequest, 'base64'));
        }

        async function saveBaseFile(file: any) {
            const token = store.githubToken;
            const url = new URL(file.contents_url);
            url.query = {
                ref: selectedPull.base.sha,
                access_token: token
            };
            const fileRequest = await fetch(url.toString()).then((r) => r.json()).then((r) => r.content)
            try {
                await fs.outputFile(`/tmp/${selectedPull.base.sha}/${file.filename}`, Buffer.from(fileRequest, 'base64'))
            } catch(e) {}
        }
    });
}