import * as vscode from 'vscode';
import axios from 'axios';
const path = require('path');

export function activate(context: vscode.ExtensionContext) {
	console.log('插件被激活～');
	const provider = new ChatGPTViewProvider(context.extensionUri);
	const webviewProvider = vscode.window.registerWebviewViewProvider(ChatGPTViewProvider.viewId, provider);

	const selection = vscode.commands.registerTextEditorCommand(
		'extension.smartcode.webview.selection',
		async ({ document, selection, options, selections }) => {
			const doc = await vscode.workspace.openTextDocument(document.uri);
			const text = doc.getText(selection);
			console.log(text);
			provider.sendMessage(text.replace(/[\r\n]/g, ''));

			// const res = await vscode.window.showInputBox({
			// 	password: false, // 输入内容是否是密码
			// 	ignoreFocusOut: true, // 默认false，设置为true时鼠标点击别的地方输入框不会消失
			// 	placeHolder: '提示信息', // 在输入框内的提示信息
			// 	prompt: '', // 在输入框下方的提示信息
			// });
		}
	);

	vscode.window.onDidChangeTextEditorSelection((event) => {
		const editor = vscode.window.activeTextEditor!;
		const selected = editor.document.getText(event.textEditor.selection);
		provider.setSelection(selected);
	});


	context.subscriptions.push(
		webviewProvider,
		selection
	);
}

class ChatGPTViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = 'extension.smartcode.webview';
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

	public setSelection(selection: string) {
		this._view?.webview.postMessage({ type: 'selection', content: selection });
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
			await vscode.commands.executeCommand("extension.smartcode.webview.focus");
			setTimeout(() => this._view?.webview.postMessage({ type: 'selection', content: text }), 300);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const indexUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'index.js'));
		const tailwindUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "tailwind.min.js"));
		const markeddUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "marked.min.js"));
		const highlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "highlight.min.js"));

		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'css', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'css', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'css', 'index.css'));
		const iconfontUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'madia', 'css', 'iconfont.css'));

		console.log(markeddUri);

		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link href="${styleResetUri}" rel="stylesheet">
					<link href="${styleVSCodeUri}" rel="stylesheet">
					<link href="${styleMainUri}" rel="stylesheet">
					<link href="${iconfontUri}" rel="stylesheet">
					<title>smartcode</title>
				</head>
				<body>
					<div class="selection">
					<ul class="chat-list"></ul>
					<input class="chat-box" placeholder="请输入问题..."/>
				</body>
				<script src="${tailwindUri}"></script>
				<script src="${highlightUri}"></script>
				<script src="${markeddUri}"></script>
				<script src="${indexUri}"></script>
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