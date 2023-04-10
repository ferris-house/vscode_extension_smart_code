import * as vscode from 'vscode';
import axios from 'axios';
const path = require('path');

export function activate(context: vscode.ExtensionContext) {
	console.log('插件被激活～');
	const provider = new ChatGPTViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ChatGPTViewProvider.viewId, provider));

	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand(
			'extension.code.optimization.webview.selection',
			async ({ document, selection, options, selections }) => {
				const doc = await vscode.workspace.openTextDocument(document.uri);
				const text = doc.getText(selection);
				console.log(text);
				provider.sendMessage(text.replace(/[\r\n]/g, ''));
			}
		)
	);
}

class ChatGPTViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = 'extension.code.optimization.webview';
	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			this.getChatGPTResult(data);
		});
	}

	async getChatGPTResult(content: string) {
		const { data } = await axios.post(`http://localhost:2000/user/info`, { ask: content });
		// console.log(data);
		this._view!.webview.postMessage({ type: 'chatGPTResult', content: data.content });
	}

	public async sendMessage(text: string) {
		if (this._view) {
			this._view?.show?.(true);
			this._view?.webview.postMessage({ type: 'selection', content: text });
		} else {
			await vscode.commands.executeCommand("extension.code.optimization.webview.focus");
			setTimeout(() => this._view?.webview.postMessage({ type: 'selection', content: text }), 300);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'index.js'));
		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'index.css'));
		const iconfontUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'iconfont.css'));

		// const diskPath = vscode.Uri.file(path.join(this._extensionUri.path, 'resources/send.png'));
		// console.log('diskPath', diskPath);
		// const aaa = diskPath.with({ scheme: 'vscode-resource' });
		// console.log(aaa);

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<link href="${iconfontUri}" rel="stylesheet">
				<title>Cat Colors</title>
			</head>
			<body>
				<ul class="chat-list"></ul>
				<input class="chat-box" placeholder="请输入问题..."/>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}