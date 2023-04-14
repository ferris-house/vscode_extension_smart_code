(function () {
    const vscode = acquireVsCodeApi();
    marked.setOptions({
        renderer: new marked.Renderer(),
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        highlight: function (code, lang) {
            //使用 highlight 插件解析文档中代码部分
            return hljs.highlightAuto(code, [lang]).value;
        }
    });
    const input = document.querySelector('.chat-box');
    const chatContainer = document.querySelector('.chat-list');
    let currentGPTNode = null;
    console.log(vscode);
    chatContainer.innerHTML = vscode.getState()?.chatContainerInnerHTML || '';

    function persistenceNode() {
        vscode.setState({ chatContainerInnerHTML: chatContainer.innerHTML });
    };

    function insertGPTNode(content) {
        const p1 = document.createElement('p');
        p1.className = 'iconfont icon-cpu identity';
        p1.innerText = ' chatGPT';
        const p2 = document.createElement('p');
        currentGPTNode = p2;
        p2.className = 'gpt-message-content';
        p2.innerText = '';
        const li = document.createElement('li');
        li.className = 'gpt-message';
        li.appendChild(p1);
        li.appendChild(p2);
        chatContainer?.appendChild(li);

        const copyBtn = document.createElement('div');
        copyBtn.className = 'copy-btn';
        copyBtn.innerText = '复制';
        const insertBtn = document.createElement('div');
        insertBtn.className = 'insert-btn';
        insertBtn.innerText = '插入';
        li.appendChild(copyBtn);
        li.appendChild(insertBtn);
        vscode.postMessage(content);
    }

    function insertAskNode(content, describe) {
        const p1 = document.createElement('p');
        p1.className = 'iconfont icon-touxiang identity';
        p1.innerText = ' 我';
        const p2 = document.createElement('p');
        p2.className = !!describe ? 'ask-message-content--selection' : 'ask-message-content';
        p2.innerText = content;
        const li = document.createElement('li');
        li.className = 'ask-message';
        li.appendChild(p1);
        if (describe) {
            const p3 = document.createElement('p');
            p3.innerText = describe;
            p3.className = 'ask-message-content';
            li.appendChild(p3);
        }
        li.appendChild(p2);
        chatContainer?.appendChild(li);
        insertGPTNode(content);
        persistenceNode();
    }

    function addGPTMessage(content) {
        currentGPTNode.innerHTML = marked.parse(content);
        persistenceNode();
    }

    // @ts-ignore
    document.querySelector('.chat-box').addEventListener('input', (e) => {
        content = e.target.value;
    });

    // 写一个js函数，实现点击按钮，复制内容到剪贴板

    addEventListener('keyup', (e) => {
        if (e.keyCode !== 13) return;
        insertAskNode(input.value);
        input.value = '';
    });

    addEventListener('message', (event) => {
        const { type, describe, content } = event.data;
        switch (type) {
            case 'ask':
                insertAskNode(content, describe);
                break;
            case 'chatGPTResult':
                addGPTMessage(content);
                break;
            default:
                break;
        }
    });
}());
