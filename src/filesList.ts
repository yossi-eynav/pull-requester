import * as vscode from 'vscode';
import { store } from './store';

class File extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly command?: vscode.Command
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
	}
}

// taken from https://github.com/Microsoft/vscode-extension-samples/blob/master/tree-view-sample/src/nodeDependencies.ts
export class PrFileProvider implements vscode.TreeDataProvider<File> {
	private _onDidChangeTreeData: vscode.EventEmitter<File | undefined> = new vscode.EventEmitter<File | undefined>();
	readonly onDidChangeTreeData: vscode.Event<File | undefined> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: File): vscode.TreeItem {
		return element;
	}

	getChildren(element?: File): Thenable<File[]> {
        if(element) {
            return Promise.resolve([]);
        }

		const files = store.currentPRFiles;
		return new Promise(resolve => {
            resolve(files.map(f => new File(f.filename,  {command: 'pullRequester.showDiff', title: 'Show Diff', arguments: [f.filename]})));
		});
	}
}
