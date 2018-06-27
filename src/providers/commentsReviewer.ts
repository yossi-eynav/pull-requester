import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { store } from '../store';

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    public async provideTextDocumentContent(uri: vscode.Uri) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return ''; }

        const file = editor.document.uri.path.replace('/tmp/', '');
        const token = store.githubToken;

        const commentsRequests = await fetch(store.currentPullRequest.url + `/comments?access_token=${token}`);
        const comments = await commentsRequests.json();
        
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
            <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
            <script src="https://unpkg.com/react/umd/react.production.min.js"></script>
            <script src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
        </head>
        <style>
            @import url('https://fonts.googleapis.com/css?family=Sunflower:300');

            body {
                font-family: 'Sunflower', sans-serif;
                color: #000;
            }
            
            .comments {
                display: flex;
                flex-direction: column;
                justify-content: space-around;
                padding: 10px;
            }
            
            .comments article {
                background: #fff;
                text-align: left;
                border: 1px solid #d6d6d6;
                box-shadow: 3px 3px 0px #bababa;
                border-radius: 3px;
                padding: 15px 20px;
                margin-bottom: 20px;
            }
            
            .comments header,
            .comments footer,
            .comments .user {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .comments img {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                margin-right: 10px;
            }
            
            .comments pre {
                background: #f7f7f7;
                white-space: pre-wrap;
                margin: 40px auto;
                padding: 8px;
            }
            
            .comments span {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        </style>

        <body>
            <div id="root"></div>

            <script type="text/babel">
                const commentList = ${JSON.stringify(comments)};

                function CommentCard({ comment }) {
                    const date = new Date(comment.created_at).toDateString();
                    const commentText = comment.body.replace(/(@\w*)/g, '<a href="//github.com/$1" target="_blank">$1</a>');
                    const diffHunk = comment.diff_hunk;
                
                    return (
                        <article id={comment.id}>
                            <header>
                                <a href={comment.user.html_url} className="user" target="_blank">
                                    <img src={comment.user.avatar_url}/>
                                    <span>{comment.user.login}</span>
                                </a>
                                <span>{date}</span>
                            </header>
                    
                            <pre dangerouslySetInnerHTML={{ __html: commentText }}></pre>

                            <pre>
                                <code dangerouslySetInnerHTML={{ __html: diffHunk }}></code>
                            </pre>
                    
                            <footer>
                                <span>{comment.path}</span>
                                <a href={comment.html_url} target="_blank">Comment Link</a>
                            </footer>
                        </article>
                    );
                }
                
                function CommentCardContainer() {
                    return (
                        <div className="comments">
                            <a href={commentList[0].pull_request_url} target="_blank">Pull Request</a>
                            {commentList.map((comment) => {
                                return <CommentCard comment={comment} key={comment.id}/>;
                            })}
                        </div>
                    );
                }

                ReactDOM.render(<CommentCardContainer/>, document.getElementById('root'));
            </script>
       
        </body>
        `;
    }
}

export const provider = new TextDocumentContentProvider();
