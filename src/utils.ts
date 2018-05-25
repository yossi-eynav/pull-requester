import { exec } from 'child_process';
import * as vscode from 'vscode';

export function execute({cmd, cwd = vscode.workspace.rootPath}) {
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