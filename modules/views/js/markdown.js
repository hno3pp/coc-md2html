/**
 * @file markdown.js
 */

!(root => {
    /**
    * @returns {string}
    */
    String.prototype.base64Decode = function () {
        return new TextDecoder().decode(Uint8Array.from(atob(this), x => x.codePointAt(0)))
    }

    /**
    * @returns {string}
    */
    String.prototype.toHex = function () {
        return [...this].map(x => x.charCodeAt(0) < 128
            ? x.charCodeAt(0).toString(16).padStart(2, '0')
            : encodeURIComponent(x).replace(/\%/g, '').toLowerCase()
        ).join('')
    }

    /**
    * @param {string} tagName
    * @param {Object} options
    * @param {Array<Element>?} options.children
    * @param {Array<string>?} options.classList
    * @param {Object<string, any>?} options.dataset
    * @param {Object<string, any>?} options.attributes
    * @param {string?} options.html
    * @param {string?} options.text
    */
    Document.prototype.createWith = function (tagName, { children, classList, dataset, attributes, html, text } = {}) {
        const element = document.createElement(tagName)
        for (const [key, value] of Object.entries(dataset ?? {})) {
            element.dataset[key] = value.toString()
        }
        for (const [key, value] of Object.entries(attributes ?? {})) {
            element.setAttribute(key, value.toString())
        }
        for (const child of [...children ?? []]) {
            element.appendChild(child)
        }
        if (html != null) {
            element.innerHTML = html
        }
        if (text != null) {
            element.innerText = text
        }
        element.classList.add(...classList ?? [])
        return element
    }

    /**
    * @param {Event} e
    * @returns {Promise}
    */
    async function onCcfoliaCopy(e) {
        const code = e.currentTarget.querySelector('code')
        if (code) {
            await navigator.clipboard.writeText(code.innerText)
        }
    }

    /**
    * @param {Event} e
    * @returns {Promise} e
    */
    async function onImageLoad(e) {
        const image = e.currentTarget
        image.width /= 2
        image.height /= 2
    }

    const renderer = {
        blockquote(token) {
            const match = token.text.match(/^\[\!(note|abstract|summary|tldr|info|todo|tip|hint|important|success|check|done|question|help|faq|warning|caution|attention|failure|fail|missing|danger|error|bug|example|quote)\]/)
            if (match) {
                const kind = match[1]
                const [first, ...rest] = token.text.split(/\r?\n/)
                const title = first.split(/\s+/).slice(1).join(' ')
                const message = rest.join('\n')
                return document.createWith('blockquote', {
                    dataset: { callout: kind },
                    children: [
                        document.createWith('div', {
                            dataset: { callout: 'title' },
                            text: title ? title : kind.slice(0, 1).toUpperCase() + kind.slice(1)
                        }),
                        document.createWith('p', {
                            dataset: { callout: 'message' },
                            html: this.parser.parse(marked.lexer(message))
                        })
                    ]
                }).outerHTML
            }
            return false
        },
        code(token) {
            if (token.lang == 'ccfolia') {
                return document.createWith('pre', {
                    dataset: { lang: 'ccfolia' },
                    children: [
                        document.createWith('code', { text: token.text }),
                        document.createWith('label', {
                            children: [
                                document.createWith('span', { text: 'ココフォリア用チャットパレット' })
                            ]
                        })
                    ]
                }).outerHTML
            }
            return false
        },
        em(token) {
            return document.createWith('em', {
                classList: ['has-text-grey'],
                html: this.parser.parseInline(token.tokens)
            }).outerHTML
        },
        hr(token) {
            // 水平線が8文字を超えていたらページ境界とする
            if (/^\-{8,}\s*$/.test(token.raw)) {
                return document.createWith('div', {
                    classList: ['page-break', 'is-flex', 'is-align-items-center'],
                    children: [
                        document.createWith('hr', { classList: ['w-100'] }),
                        document.createWith('span', { classList: ['is-nowrap', 'mx-2'], text: '改ページ' }),
                        document.createWith('hr', { classList: ['w-100'] })
                    ]
                }).outerHTML
            }
            return false
        }
    }

    const attribute = {
        name: 'attribute',
        level: 'inline',
        start(src) {
            return src.match(/(STR|CON|POW|DEX|APP|SIZ|INT|EDU|SAN|HP|MP|DB|耐久|正気度)/)?.index
        },
        tokenizer(src, tokens) {
            const rule = /^(?<attribute>STR|CON|POW|DEX|APP|SIZ|INT|EDU|SAN|HP|MP|DB|耐久|正気度)(?<operator>[\+\-\u00d7\/])?(((?<value1>[0-9]+(\.[0-9]+)?)|\((?<value2>[0-9]+)\)))?/;
            const match = rule.exec(src);
            if (match) {
                return {
                    type: 'attribute',
                    raw: match[0],
                    attribute: match.groups.attribute,
                    operator: match.groups.operator?.trim(),
                    value: match.groups.value1,
                    valueWithParen: match.groups.value2
                }
            }
        },
        renderer(token) {
            const children = []
            if (token.attribute) {
                children.push(document.createWith('span', { text: token.attribute }))
            }
            if (token.operator) {
                children.push(document.createWith('span', { text: token.operator }))
            }
            if (token.value) {
                children.push(document.createWith('b', { text: token.value }))
            }
            if (token.valueWithParen) {
                children.push(document.createWith('span', {
                    dataset: { prefix: '(', suffix: ')' },
                    children: [
                        document.createWith('b', { text: token.valueWithParen })
                    ]
                }))
            }
            return document.createWith('span', {
                dataset: { type: 'attribute' },
                children
            }).outerHTML
        }
    }

    const dice = {
        name: 'dice',
        level: 'inline',
        start(src) {
            return src.match(/[+-]?[0-9]+/)?.index
        },
        tokenizer(src, tokens) {
            {
                // 1d10/1d10形式
                const rule = /^(?<success>[+-]?[0-9]+([Dd][0-9]+(\s*[+-]\s*[0-9A-Z]+)?)?)\/(?<failure>[+-]?[0-9]+([Dd][0-9A-Z]+(\s*[+-]\s*[0-9]+)?)?)/;
                const match = rule.exec(src);
                if (match) {
                    return {
                        type: 'dice',
                        raw: match[0],
                        kind: 'sanity',
                        success: match.groups.success,
                        failure: match.groups.failure
                    }
                }
            }
            {
                // 1d6+2形式
                const rule = /^([+-]?[0-9]+[Dd][0-9]+(\s*[+-]\s*[0-9]+)?)/;
                const match = rule.exec(src);
                if (match) {
                    return {
                        type: 'dice',
                        raw: match[0],
                        kind: 'dice+const',
                        dice: match[0]
                    }
                }
            }
        },
        renderer(token) {
            if (token.kind == 'dice+const') {
                return document.createWith('span', {
                    children: [
                        document.createWith('i', {
                            dataset: { type: 'dice' },
                            classList: ['fa-solid', 'fa-dice-d6', 'ml-1']
                        }),
                        document.createWith('b', {
                            dataset: { type: 'dice' },
                            text: token.dice.toUpperCase()
                        })
                    ]
                }).outerHTML
            } else if (token.kind == 'sanity') {
                return document.createWith('span', {
                    children: [
                        document.createWith('i', {
                            dataset: { type: 'sanity' },
                            classList: ['fa-solid', 'fa-dice-d6', 'ml-1']
                        }),
                        document.createWith('b', {
                            dataset: { type: 'sanity-success' },
                            text: token.success.toUpperCase()
                        }),
                        document.createWith('span', {
                            classList: ['has-text-grey-light'],
                            text: '/'
                        }),
                        document.createWith('b', {
                            dataset: { type: 'sanity-failure' },
                            text: token.failure.toUpperCase()
                        })
                    ]
                }).outerHTML
            }
            throw new Error(token)
        }
    }

    const inlineFormula = {
        name: 'inlineFormula',
        level: 'inline',
        start(src) {
            return src.match(/\$/)?.index
        },
        tokenizer(src, tokens) {
            const rule = /^\$([^\$]*)\$/;
            const match = rule.exec(src);
            if (match) {
                return {
                    type: 'inlineFormula',
                    raw: match[0],
                    formula: match[1]
                }
            }
        },
        renderer(token) {
            const html = MathJax.tex2chtml(token.formula, { display: false })
            return html.outerHTML
        }
    }

    const item = {
        name: 'item',
        level: 'inline',
        start(src) {
            return src.match(/【/)?.index
        },
        tokenizer(src, tokens) {
            const rule = /^【(.*?)】/;
            const match = rule.exec(src);
            if (match) {
                const token = {
                    type: 'item',
                    raw: match[0],
                    name: match[1],
                    tokens: []
                }
                this.lexer.inlineTokens(token.name, token.tokens)
                return token
            }
        },
        renderer(token) {
            return document.createWith('span', {
                dataset: { type: 'item' },
                html: `【${this.parser.parseInline(token.tokens)}】`
            }).outerHTML
        }
    }

    const image = {
        name: 'image',
        level: 'inline',
        start(src) {
            return src.match(/\!\[\[/)?.index
        },
        tokenizer(src, tokens) {
            const rule = /^\!\[\[(.+?)\]\]/;
            const match = rule.exec(src);
            if (match) {
                const token = {
                    type: 'image',
                    raw: match[0],
                    name: match[1],
                    tokens: []
                }
                this.lexer.inlineTokens(token.name, token.tokens)
                return token
            }
        },
        renderer(token) {
            function basename(path) {
                const index = path.lastIndexOf('/')
                return index >= 0 ? path.slice(index + 1) : path
            }

            function isScaleToFit(token) {
                const src = basename(token.name)
                return /-100\.(gif|jpe?g|png)$/.test(src)
            }

            function isConstSize(token) {
                const src = basename(token.name)
                const match = src.match(/-([0-9]+)x([0-9]+)\.(gif|jpe?g|png)$/)
                if (match) {
                    return [+match[1], +match[2]]
                }
                return [null, null]
            }

            const element = document.createWith('img', {
                attributes: { src: basename(token.name) },
                dataset: { 'image': 'inline' }
            })
            const [width, height] = isConstSize(token);
            if (width != null && height != null) {
                element.style.width = `${width}px`
                element.style.height = `${height}px`
            } else if (isScaleToFit(token)) {
                element.style.width = `100%`
                element.style.height = `100%`
            }
            return element.outerHTML
        }
    }

    const localLink = {
        name: 'localLink',
        level: 'inline',
        start(src) {
            return src.match(/\[/)?.index
        },
        tokenizer(src, tokens) {
            const rule = /^\[\[(?<link>(\\.|[^\|\]])+)(\|(?<label>(\\.|[^\]])+))?\]\]/;
            const match = rule.exec(src);
            if (match) {
                return {
                    type: 'localLink',
                    raw: match[0],
                    link: match.groups.link,
                    label: match.groups.label
                }
            }
        },
        renderer(token) {
            const a = document.createElement('a')
            a.innerText = token.label ?? token.link
            a.href = `#${token.link.toHex()}`
            return a.outerHTML
        }
    }

    const skill = {
        name: 'skill',
        level: 'inline',
        start(src) {
            return src.match(/〈/)?.index
        },
        tokenizer(src, tokens) {
            const rule = /^〈(.*?)〉/;
            const match = rule.exec(src);
            if (match) {
                const token = {
                    type: 'skill',
                    raw: match[0],
                    name: match[1].trim(),
                    tokens: []
                }
                this.lexer.inlineTokens(token.name, token.tokens)
                return token
            }
        },
        renderer(token) {
            return document.createWith('span', {
                dataset: { type: 'skill' },
                classList: ['is-nowrap'],
                html: `〈${this.parser.parseInline(token.tokens)}〉`
            }).outerHTML
        }
    }

    const highlight = {
        name: 'highlight',
        level: 'inline',
        start(src) {
            return src.match(/\{/)?.index
        },
        tokenizer(src, tokens) {
            const rule = /^\{(.*?)\}/;
            const match = rule.exec(src);
            if (match) {
                const token = {
                    type: 'highlight',
                    raw: match[0],
                    text: match[1],
                    tokens: []
                }
                this.lexer.inlineTokens(token.text, token.tokens)
                return token
            }
        },
        renderer(token) {
            return document.createWith('span', {
                dataset: { type: 'highlight' },
                html: `{${this.parser.parseInline(token.tokens)}}`
            }).outerHTML
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        marked.use({ renderer })
        marked.use({ extensions: [
            attribute,
            dice,
            highlight,
            image,
            inlineFormula,
            item,
            localLink,
            skill
        ]})

        const markdown = document.querySelector('[data-id="markdown"]')
        const body = markdown.innerText.base64Decode()
        markdown.innerHTML = marked.parse(body)

        for (const element of [...document.querySelectorAll('pre[data-lang="ccfolia"]')]) {
            element.addEventListener('click', onCcfoliaCopy)
        }

        for (const element of [...document.querySelectorAll('img[data-image="inline"]')]) {
            element.addEventListener('load', onImageLoad)
        }

        MathJax.startup.document.clear();
        MathJax.startup.document.updateDocument();
    })
})(this)
