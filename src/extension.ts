import * as vscode from 'vscode';
import axios from 'axios';
const https = require('https');
const http = require('http');

export function activate(context: vscode.ExtensionContext) {
	console.log('插件被激活～');
	const selectionProvider = new SelectionViewProvider(context.extensionUri);
	const chatProvider = new ChatViewProvider(context.extensionUri);
	const selctionWebview = vscode.window.registerWebviewViewProvider(SelectionViewProvider.viewId, selectionProvider);
	const chatWebview = vscode.window.registerWebviewViewProvider(ChatViewProvider.viewId, chatProvider);

	const selection = vscode.commands.registerCommand(
		'chat.webview.selection',
		async () => {
			const ask = await vscode.window.showInputBox({
				ignoreFocusOut: true,
				placeHolder: '请输入你的问题描述',
				prompt: '尽可能详细描述你的诉求，便于chatGPT能够给予更专业的回复'
			});
			if (!ask) return;
			chatProvider.sendAskMessage(ask);
		}
	);

	vscode.window.onDidChangeTextEditorSelection(() => {
		selectionProvider.sendSelectedMessage();
	});


	context.subscriptions.push(
		selctionWebview,
		chatWebview,
		selection
	);
}

class SelectionViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = 'selection.webview';
	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) {

	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
		webviewView.onDidChangeVisibility(() => {
			if (!webviewView.visible) return;
			this.sendSelectedMessage();
		});
	}

	public sendSelectedMessage() {
		if (!this._view) return;
		const content = getSelectedContent();
		this._view.webview.postMessage(content);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const selectionUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'selection.js'));
		// const tailwindUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "tailwind.min.js"));
		const markeddUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "marked.min.js"));
		const highlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "highlight.min.js"));
		const styleHighlighUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'css', 'highligh.css'));

		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link href="${styleHighlighUri}" rel="stylesheet">
					<title>smartcode</title>
				</head>
				<body>
					<div class="selection">
				</body>
				<script nonce="${nonce}" src="${markeddUri}"></script>
				<script nonce="${nonce}" src="${highlightUri}"></script>
				<script nonce="${nonce}" src="${selectionUri}"></script>
			</html>`;
	}
}

class ChatViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = 'chat.webview';
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
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			this.getChatGPTResult(data);
		});
	}

	tarnsformGPTMessage = (message: string) => {
		let text = '';
		try {
			const splitMessage: string[] = message.split('\n\n');
			for (let i = 0; i < splitMessage.length; i++) {
				if (splitMessage[i] === '') continue;
				const jsonStrMessage = splitMessage[i].replace(/^data:/g, '');
				const jsonMessage = JSON.parse(jsonStrMessage);
				const content = jsonMessage.choices[0].delta?.content || '';
				text += content;
			}
		} catch (e) { }
		return text;
	};

	async getChatGPTResult(content: string) {
		try {
			const { data } = await axios({
				method: 'post',
				url: 'https://t-apigateway.gaodun.com/gd-bot/web/bot/v1/chat',
				data: {
					botId: "78",
					chatId: "16814661049250481",
					content,
					userId: "1"
				},
				headers: {
					'Content-Type': 'application/json;',
					"Authentication": 'Basic eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjoiZWJvaWJpSGVreDVqeVN5NENyOThqalBWVmFZTFpBMWtObVk0NWMyaDUwbVQwTk5wWWUzT2NDUDBwQWVqY1JYamZhM0pOeWxMVkxDSFdvbWliSzJib2FTd2pYS2c5N21zTzZYeThVUFBJTDVOcStqajk5amIzNkc3ekNpTU9aWnFKcTNVWDVEQ3hqckZpdnpNQVc5bDVQMFNHSGM5QTllRTlZbGdpbzg0azVMVTRGSHRwWGxROXhIbStoUTFLRFFqVExVR1IyOFpGVDhoNWRUbS9lY01wMEdTVWtoYmdNRzdreXF5Vnd0UjV6MTVHdXhGdWlHZU1teFlkL09JZkQyTnVMdzhBL3NJMDRoZHdVMlNhTnFESUpYQnpQb3JaVnRPanBlcXhTVE9QYzA9IiwiZXhwIjoxNjgxNzA4NDk2LCJqdGkiOiI2YzVkMzM5YS1hMWQ0LTQyYzAtOTAxNC03YmFhOTRlM2M3NWQiLCJpYXQiOjE2ODE0NDkyOTYsImlzcyI6IjIzMDMwMyIsInN1YiI6Ij0ifQ.SfzPY6Pi3PvDBeXIDc8zmbxOnMja1s7Lo3_kPGRUJ-M',
					"Connection": "keep-alive",
				}
			});
			const { status, result } = data;
			// console.log('getChatGPTResult_data', result);
			if (status !== 0) return;
			const { botType, fixedPrompt, headerMap, isMappingVector, knowledgeIdList, requestAiParams } = result;
			let answer = '';
			const req = https.request('https://t-ai.gaodun.com/v1/chat/completions/stream', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...headerMap,
				},
			}, (res: any) => {
				res.setEncoding('utf8');
				res.on('data', (chunk: any) => {
					answer += this.tarnsformGPTMessage(chunk);
					// console.log('getChatGPTResult_xhrReader', txt)
					this._view?.webview.postMessage({ type: 'chatGPTResult', content: answer });
				});
			});
			req.write(JSON.stringify(requestAiParams));
			req.end();
		} catch (error) {
			console.log(error);
		}
	}

	public async sendAskMessage(describe: string) {
		let content = getSelectedContent();
		content = content.replace(/[\r\n]/g, '');
		if (this._view) {
			this._view?.show?.(true);
			this._view?.webview.postMessage({ type: 'ask', describe, content });
		} else {
			await vscode.commands.executeCommand("extension.smartcode.webview.focus");
			setTimeout(() => this._view?.webview.postMessage({ type: 'ask', describe, content }), 300);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const mainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
		const markeddUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "marked.min.js"));
		const highlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "scripts", "highlight.min.js"));

		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'css', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'css', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'css', 'index.css'));
		const styleIconfontUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'css', 'iconfont.css'));
		const styleHighlighUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'css', 'highligh.css'));

		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link href="${styleResetUri}" rel="stylesheet">
					<link href="${styleVSCodeUri}" rel="stylesheet">
					<link href="${styleMainUri}" rel="stylesheet">
					<link href="${styleIconfontUri}" rel="stylesheet">
					<link href="${styleHighlighUri}" rel="stylesheet">
					<title>smartcode</title>
				</head>
				<body>
					<div class="selection">
					<ul class="chat-list"></ul>
					<input class="chat-box" placeholder="请输入问题..."/>
					<div class="chat-box-mat"/>
				</body>
				<script nonce="${nonce}" src="${markeddUri}"></script>
				<script nonce="${nonce}" src="${highlightUri}"></script>
				<script nonce="${nonce}" src="${mainUri}"></script>
			</html>`;
	}
}

function getSelectedContent() {
	const editor = vscode.window.activeTextEditor!;
	const selected = editor.document.getText(editor.selection);
	return selected;
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}