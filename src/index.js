import { decode } from 'png-chunk-text';
import extractChunks from 'png-chunks-extract';
import './style.css';

function prettifyJson(json) {
    try {
        return JSON.stringify(JSON.parse(json), null, 2);
    } catch (error) {
        return json;
    }
}

/**
 * Extracts text chunks from a PNG image and displays them.
 * @param {HTMLDialogElement} dialog Dialog element containing the image
 * @param {string} url URL of the image to extract text from
 * @returns {Promise<void>}
 */
async function displayImageMetadata(dialog, url) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const chunks = extractChunks(new Uint8Array(buffer));
        const textChunks = chunks.filter(chunk => chunk.name === 'tEXt').map(chunk => decode(chunk.data));

        if (textChunks.length === 0) {
            return;
        }

        const holder = dialog.querySelector('.img_enlarged_holder');

        const originalPrompt = holder.parentNode.querySelector('pre > code');

        if (originalPrompt instanceof HTMLElement && originalPrompt.textContent) {
            textChunks.unshift(({
                keyword: 'Original prompt',
                text: originalPrompt.textContent,
            }));
        }

        const table = document.createElement('table');
        table.classList.add('img_metadata');

        const header = document.createElement('tr');
        const headerName = document.createElement('th');
        headerName.textContent = 'Name';
        const headerValue = document.createElement('th');
        headerValue.textContent = 'Value';

        header.appendChild(headerName);
        header.appendChild(headerValue);

        table.appendChild(header);

        textChunks.forEach((chunk) => {
            const row = document.createElement('tr');
            const name = document.createElement('td');
            name.textContent = chunk.keyword;
            const value = document.createElement('td');
            value.textContent = prettifyJson(chunk.text);

            row.appendChild(name);
            row.appendChild(value);

            table.appendChild(row);

            if (!('clipboard' in navigator)) {
                return;
            }

            const copyButton = document.createElement('div');
            copyButton.title = 'Copy value to clipboard';
            copyButton.classList.add('right_menu_button', 'img_metadata_button', 'fa-solid', 'fa-copy');

            copyButton.addEventListener('click', async () => {
                await navigator.clipboard.writeText(chunk.text);
                toastr.info('Text copied to clipboard');
            });

            value.appendChild(copyButton);
        });

        holder.insertAdjacentElement('afterend', table);

        const hideButton = document.createElement('div');
        hideButton.title = 'Hide metadata';
        hideButton.classList.add('right_menu_button', 'img_metadata_button', 'fa-solid', 'fa-xmark');

        hideButton.addEventListener('click', () => {
            table.remove();
            hideButton.remove();
        });

        headerValue.appendChild(hideButton);
    } catch (error) {
        console.error('Failed to extract text chunks from image', error);
    }
}

(function () {
    // Set mutation observer to watch for new nodes with class 'img_enlarged' inside dialogs
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLDialogElement) {
                    const img = node.querySelector('.img_enlarged');
                    if (img instanceof HTMLImageElement) {
                        displayImageMetadata(node, img.src);
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
})();
