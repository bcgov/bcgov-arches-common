export function htmlToPlainText(html: string): string {
    if (!html) return '';

    // If for some reason this runs in a non-DOM context, fall back to a dumb stripper
    if (typeof document === 'undefined') {
        return stripTagsFallback(html);
    }

    const container = document.createElement('div');
    container.innerHTML = html;

    // 1) Turn <br> into explicit newline characters
    container.querySelectorAll('br').forEach((br) => {
        br.replaceWith('\n');
    });

    // 2) Handle list items (<ul>/<ol>/<li>) → bullets / numbers
    container.querySelectorAll('li').forEach((li) => {
        const parent = li.parentElement;
        let prefix = '• ';

        if (parent && parent.tagName.toLowerCase() === 'ol') {
            // Compute 1-based index among sibling <li> elements
            const lis = Array.from(parent.children).filter(
                (el) => el.tagName && el.tagName.toLowerCase() === 'li',
            );
            const index = lis.indexOf(li);
            prefix = `${index + 1}. `;
        }

        // Insert the prefix at the start of the <li>
        li.insertBefore(document.createTextNode(prefix), li.firstChild);
        // Add a newline after each list item
        li.appendChild(document.createTextNode('\n'));
    });

    // 3) Paragraphs: ensure a blank line after each <p>
    container.querySelectorAll('p').forEach((p) => {
        p.appendChild(document.createTextNode('\n'));
    });

    // 4) Let the browser do the hard part: strip all remaining tags
    let text = container.textContent || '';

    // 5) Normalize whitespace a bit
    text = text
        .replace(/\u00a0/g, ' ') // non-breaking spaces → regular spaces
        .replace(/[ \t]+\n/g, '\n') // trim spaces before newlines
        // .replace(/\n{3,}/g, '\n\n') // collapse >2 consecutive newlines to 2
        // .replace(/[ \t]{2,}/g, ' ') // collapse multiple spaces to one
        .trim();

    return text;
}

// Very simple fallback if document is not available (e.g., SSR or tests)
function stripTagsFallback(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
