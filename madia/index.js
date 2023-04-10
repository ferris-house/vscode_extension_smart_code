(function () {
    const vscode = acquireVsCodeApi();
    const input = document.querySelector('.chat-box');
    const ul = document.querySelector('.chat-list');

    function addAskMessage(value, fromSelection = false) {
        const p1 = document.createElement('p');
        p1.innerText = ' 我';
        p1.className = 'iconfont icon-touxiang identity';
        const p2 = document.createElement('p');
        p2.innerText = value;
        p2.className = fromSelection ? 'ask-message-content--selection' : 'ask-message-content';
        const li = document.createElement('li');
        li.className = 'ask-message';
        li.appendChild(p1);
        if (fromSelection) {
            const p3 = document.createElement('p');
            p3.innerText = '能对它进行优化吗？然后说一下优化前后的差别。';
            p3.className = 'ask-message-content';
            li.appendChild(p3);
        }
        li.appendChild(p2);
        ul?.appendChild(li);
        vscode.postMessage(value);
    }

    function addGPTMessage(value) {
        const p1 = document.createElement('p');
        p1.innerText = ' chatGPT';
        p1.className = 'iconfont icon-cpu identity';
        const p2 = document.createElement('p');
        p2.innerText = value;
        p2.className = 'gpt-message-content';
        const li = document.createElement('li');
        li.className = 'gpt-message';
        li.appendChild(p1);
        li.appendChild(p2);
        ul?.appendChild(li);
    }

    // @ts-ignore
    document.querySelector('.chat-box').addEventListener('input', (e) => {
        content = e.target.value;
    });

    addEventListener('keyup', (e) => {
        if (e.keyCode !== 13) return;
        addAskMessage(input.value);
        input.value = '';
    });

    addEventListener('message', (event) => {
        const { data } = event;
        switch (data.type) {
            case 'selection':
                addAskMessage(data.content, true);
                break;
            case 'chatGPTResult':
                addGPTMessage(data.content);
                break;
            default:
                break;
        }
    });
}());
