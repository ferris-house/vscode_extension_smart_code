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

    const selectionBox = document.querySelector('.selection');

    function addSelection(selection, format = true) {
        let content = selection;
        if (format) {
            content = '```' + 'javascript' + '\n' + content + '\n```';
        }
        selectionBox.innerHTML = marked.parse(content);
        vscode.setState(content);
    }

    addEventListener('message', (event) => {
        const message = event.data;
        addSelection(message);
    });

    addSelection(vscode.getState(), false);
}());
