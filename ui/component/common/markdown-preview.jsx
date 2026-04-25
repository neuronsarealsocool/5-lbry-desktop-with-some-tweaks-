// @flow
import { CHANNEL_STAKED_LEVEL_VIDEO_COMMENTS } from 'config';
import { formattedLinks, inlineLinks } from 'util/remark-lbry';
import { formattedTimestamp, inlineTimestamp } from 'util/remark-timestamp';
import { formattedEmote, inlineEmote } from 'util/remark-emote';
import * as ICONS from 'constants/icons';
import * as React from 'react';
import Button from 'component/button';
import classnames from 'classnames';
import defaultSchema from 'hast-util-sanitize/lib/github.json';
import MarkdownLink from 'component/markdownLink';
import OptimizedImage from 'component/optimizedImage';
import reactRenderer from 'remark-react';
import remark from 'remark';
import remarkAttr from 'remark-attr';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';
import remarkFrontMatter from 'remark-frontmatter';
import remarkStrip from 'strip-markdown';
import ZoomableImage from 'component/zoomableImage';
import { parse } from 'node-html-parser';

const RE_EMOTE = /:\+1:|:-1:|:[\w-]+:/;

function isEmote(title, src) {
  return title && RE_EMOTE.test(title) && src.includes('static.odycdn.com/emoticons');
}

type SimpleTextProps = {
  children?: React.Node,
};

type SimpleLinkProps = {
  href?: string,
  title?: string,
  embed?: boolean,
  children?: React.Node,
};

type ImageLinkProps = {
  src: string,
  title?: string,
  alt?: string,
  helpText?: string,
};

type MarkdownProps = {
  strip?: boolean,
  content: ?string,
  simpleLinks?: boolean,
  noDataStore?: boolean,
  className?: string,
  parentCommentId?: string,
  isMarkdownPost?: boolean,
  disableTimestamps?: boolean,
  stakedLevel?: number,
};

// ****************************************************************************
// ****************************************************************************

const SimpleText = (props: SimpleTextProps) => {
  return <span>{props.children}</span>;
};

// ****************************************************************************
// ****************************************************************************

const SimpleLink = (props: SimpleLinkProps) => {
  const { title, children, href, embed } = props;

  if (!href) {
    return children || null;
  }

  if (!href.startsWith('lbry:/')) {
    return (
      <a href={href} title={title} target={'_blank'} rel={'noreferrer noopener'}>
        {children}
      </a>
    );
  }

  const [uri, search] = href.split('?');
  const urlParams = new URLSearchParams(search);
  const embedParam = urlParams.get('embed');

  if (embed || embedParam) {
    // Decode this since users might just copy it from the url bar
    const decodedUri = decodeURI(uri);
    return (
      <div className="embed__inline-button embed__inline-button--preview">
        <pre>{decodedUri}</pre>
      </div>
    );
  }

  // Dummy link (no 'href')
  return <a title={title}>{children}</a>;
};

// ****************************************************************************
// ****************************************************************************

const SimpleImageLink = (props: ImageLinkProps) => {
  const { src, title, alt, helpText } = props;

  if (!src) {
    return null;
  }

  if (isEmote(title, src)) {
    return <OptimizedImage src={src} title={title} className="emote" waitLoad loading="lazy" />;
  }

  return (
    <Button
      button="link"
      iconRight={ICONS.EXTERNAL}
      label={title || alt || src}
      title={helpText || title || alt || src}
      className="button--external-link"
      href={src}
    />
  );
};

// ****************************************************************************
// ****************************************************************************

// Use github sanitation schema
const schema = { ...defaultSchema };

// Extend sanitation schema to support lbry protocol
schema.protocols.href.push('lbry');
schema.attributes.a.push('embed');

// Allow HTML layout/formatting tags
schema.tagNames = [...schema.tagNames, 'center', 'iframe', 'mark', 'font', 'span', 'video', 'audio', 'source'];

// Allow formatting/layout attributes on all elements
schema.attributes['*'] = [...(schema.attributes['*'] || []), 'align', 'style', 'color', 'width', 'height'];

// Allow iframe attributes
schema.attributes.iframe = [
  'src', 'width', 'height', 'frameborder', 'allowfullscreen',
  'allow', 'title', 'loading', 'style', 'referrerpolicy',
];

// Strip dangerous HTML (scripts, event handlers) while leaving formatting HTML intact.
// Used for isMarkdownPost rendering which needs raw HTML pass-through.
function removeDangerousHtml(str) {
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\s*\/?\s*script[^>]*>/gi, '')
    .replace(/\s(on\w+)\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s(on\w+)\s*=[^\s>]*/gi, '');
}

// Ensure rawhtml elements (and their children) are fully removed in sanitized
// contexts (comments, descriptions) so raw HTML never leaks as text.
schema.strip = [...(schema.strip || []), 'rawhtml'];

const REPLACE_REGEX = /(<iframe\s+src=["'])(.*?(?=))(["']\s*><\/iframe>)/g;

// Custom toHast handler for MDAST `html` nodes.
// mdast-util-to-hast's default html handler returns null (or a raw node with
// allowDangerousHtml) — neither survives hast-to-hyperscript which only
// processes `element` and `text` HAST node types.
// By overriding the handler we return a real HAST element that
// hast-to-hyperscript can convert to a React component call.
const toHastHtmlHandler = (h, node) => ({
  type: 'element',
  tagName: 'rawhtml',
  properties: {},
  children: [{ type: 'text', value: node.value }],
});

// Remark plugin: remark parses inline HTML tags (e.g. <mark>, <font>) as
// separate MDAST `html` nodes within a paragraph, which means
// <mark style="..."><font color="...">red</font></mark> becomes 5 separate
// nodes — each wrapped in its own div — breaking the nesting.
// This plugin merges paragraphs whose children are *only* html/text nodes
// into a single block `html` node so the tags survive intact.
function remarkHtmlParagraphFix() {
  return function transformer(tree) {
    function walk(node) {
      if (!node.children) return;
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child.type === 'paragraph' && child.children) {
          const allHtmlOrText = child.children.every(function (c) {
            return c.type === 'html' || c.type === 'text';
          });
          if (allHtmlOrText && child.children.some(function (c) { return c.type === 'html'; })) {
            const html = child.children.map(function (c) { return c.value; }).join('');
            node.children.splice(i, 1, { type: 'html', value: html, position: child.position });
          }
        } else {
          walk(child);
        }
      }
    }
    walk(tree);
  };
}

// ****************************************************************************
// ****************************************************************************

function isStakeEnoughForPreview(stakedLevel) {
  return !stakedLevel || stakedLevel >= CHANNEL_STAKED_LEVEL_VIDEO_COMMENTS;
}

// ****************************************************************************
// ****************************************************************************

export default React.memo<MarkdownProps>(function MarkdownPreview(props: MarkdownProps) {
  const {
    content,
    strip,
    simpleLinks,
    noDataStore,
    className,
    parentCommentId,
    isMarkdownPost,
    disableTimestamps,
    stakedLevel,
  } = props;

  const strippedContent = content
    ? content.replace(REPLACE_REGEX, (iframeHtml) => {
        // Let the browser try to create an iframe to see if the markup is valid
        let lbrySrc;
        try {
          let p = parse(iframeHtml);
          const tag = p.getElementsByTagName('iframe');
          const s = tag[0];
          lbrySrc = s && s.getAttribute('src');
        } catch (e) {}

        if (lbrySrc && lbrySrc.startsWith('lbry://')) {
          return lbrySrc;
        }
        return iframeHtml;
      })
    : '';

  // For full markdown posts, pre-strip dangerous HTML then let remark pass the
  // remaining HTML (center, mark, iframe, etc.) through to the browser.
  // For comments/descriptions, keep the normal schema-based sanitisation.
  const postContent = isMarkdownPost ? removeDangerousHtml(strippedContent) : strippedContent;

  const remarkOptions: Object = {
    sanitize: isMarkdownPost ? false : schema,
    // Override the html MDAST handler so HTML blocks become real HAST elements
    // (tagName: 'rawhtml') that hast-to-hyperscript can pass to our React component.
    toHast: { handlers: { html: toHastHtmlHandler } },
    fragment: React.Fragment,
    remarkReactComponents: {
      a: noDataStore
        ? SimpleLink
        : (linkProps) => (
            <MarkdownLink
              {...linkProps}
              parentCommentId={parentCommentId}
              isMarkdownPost={isMarkdownPost}
              simpleLinks={simpleLinks}
              allowPreview={isStakeEnoughForPreview(stakedLevel)}
            />
          ),
      // Workaraund of remarkOptions.Fragment
      div: React.Fragment,
      img: (imgProps) =>
        noDataStore ? (
          <div className="file-viewer file-viewer--document">
            <img {...imgProps} />
          </div>
        ) : isStakeEnoughForPreview(stakedLevel) && !isEmote(imgProps.title, imgProps.src) ? (
          <ZoomableImage {...imgProps} />
        ) : (
          <SimpleImageLink src={imgProps.src} alt={imgProps.alt} title={imgProps.title} />
        ),
      // Renders raw HTML blocks in markdown posts only (stripped in comments/descriptions)
      rawhtml: ({ children }) => {
        // eslint-disable-next-line no-console
        console.warn('[MarkdownPreview] rawhtml called. isMarkdownPost=', isMarkdownPost, 'children=', children);
        if (!isMarkdownPost) return null;
        const html = Array.isArray(children) ? children.join('') : (children || '');
        return <div dangerouslySetInnerHTML={{ __html: removeDangerousHtml(html) }} />;
      },
    },
  };

  const remarkAttrOpts = {
    scope: 'extended',
    elements: ['link'],
    extend: { link: ['embed'] },
    defaultValue: true,
  };

  // Strip all content and just render text
  if (strip) {
    // Remove new lines and extra space
    remarkOptions.remarkReactComponents.p = SimpleText;
    return (
      <span dir="auto" className="markdown-preview">
        {
          remark()
            .use(remarkStrip)
            .use(remarkFrontMatter, ['yaml'])
            .use(reactRenderer, remarkOptions)
            .processSync(content).contents
        }
      </span>
    );
  }

  return (
    <div dir="auto" className={classnames('markdown-preview', className)}>
      {
        remark()
          .use(remarkAttr, remarkAttrOpts)
          // Merge inline-HTML-only paragraphs into a single html node so that
          // tags like <mark style="..."> survive the pipeline intact.
          .use(isMarkdownPost ? remarkHtmlParagraphFix : null)
          // Remark plugins for lbry urls
          // Note: The order is important
          .use(formattedLinks)
          .use(inlineLinks)
          .use(disableTimestamps || isMarkdownPost ? null : inlineTimestamp)
          .use(disableTimestamps || isMarkdownPost ? null : formattedTimestamp)
          // Emojis
          .use(inlineEmote)
          .use(formattedEmote)
          .use(remarkEmoji)
          // Render new lines without needing spaces.
          .use(remarkBreaks)
          .use(remarkFrontMatter, ['yaml'])
          .use(reactRenderer, remarkOptions)
          .processSync(postContent).contents
      }
    </div>
  );
});
