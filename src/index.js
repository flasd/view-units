// /* eslint-disable no-use-before-define */
/*!
 * @license MIT
 * @preserve
 *
 * vUnit.js: A vanilla JS alternative for vh and vw CSS units.
 * Version: 0.2.0
 * https://github.com/joaocunha/v-unit/
 *
 * @author João Cunha - joao@joaocunha.net - twitter.com/joaocunha
 */
export default function vUnit(options) {
  if (!window || !document) {
    return;
  }

  // Just an alias for easier readability (and to preserve `this` context)
  const vunit = this;

  // For extending the options
  const opts = options || {};

  vunit.options = {
    // The ID for the appended stylesheet
    stylesheetId: opts.stylesheetId || 'v-unit-stylesheet',

    // The interval between each check in miliseconds
    viewportObserverInterval: opts.viewportObserverInterval || 100,

    // The CSS rules to be vUnit'd
    CSSMap: opts.CSSMap || null,

    // onResize callback
    onResize: opts.onResize || (() => { }),
  };

  // Stores the viewport dimensions so the observer can check against it and update it.
  vunit.viewportSize = {
    height: 0,
    width: 0,
  };

  /**
   * @function createStylesheet
   * Creates an empty stylesheet that will hold the v-unit rules.
   *
   * @returns {HTMLStyleElement} An empty stylesheet element.
   */
  function createStylesheet() {
    const stylesheet = document.createElement('style');

    stylesheet.setAttribute('rel', 'stylesheet');
    stylesheet.setAttribute('type', 'text/css');
    stylesheet.setAttribute('media', 'screen');
    stylesheet.setAttribute('id', vunit.options.stylesheetId);

    return stylesheet;
  }

  /**
   * @function createCSSRules
   * Create CSS rules based on the viewport dimensions.
   *
   * It loops through a map of CSS properties and creates rules ranging from 1 to 100 percent
   * of its size.
   *
   * We used to Math.round() the values, but then we can't stack two .vw50 elements side by
   * side on odd viewport widths. If we use Math.floor, we end up with a 1px gap. On the other
   * hand, if we use pixel decimals (no round or floor), the browsers ajusts the width
   * properly.
   *
   * Example:
   * .vw1   {width: 20px;}
   * .vw2   {width: 40px;}
   *         ...
   * .vw100 {width: 2000px;}
   * .vh1   {height: 5px;}
   * .vh2   {height: 10px;}
   *         ...
   * .vh100 {height: 500px;}
   *
   * @returns {String} The concatenated CSS rules in string format.
   */
  function createCSSRules() {
    const computedHeight = (vunit.viewportSize.height / 100);
    const computedWidth = (vunit.viewportSize.width / 100);
    const vmin = Math.min(computedWidth, computedHeight);
    const vmax = Math.max(computedWidth, computedHeight);
    const map = vunit.options.CSSMap;
    let CSSRules = '';
    let value = 0;

    // Loop through all selectors passed on the CSSMap option
    Object.keys(map).forEach((selector) => {
      const { property } = map[selector];

      // Adds rules from className1 to className100 to the stylesheet
      for (let range = 1; range <= 100; range += 1) {
        // Checks what to base the value on (viewport width/height or vmin/vmax)
        switch (map[selector].reference) {
          case 'vw':
            value = computedWidth * range;
            break;
          case 'vh':
            value = computedHeight * range;
            break;
          case 'vmin':
            value = vmin * range;
            break;
          case 'vmax':
            value = vmax * range;
            break;

          default:
            value = 0;
        }

        // Barebones templating syntax
        const CSSRuleTemplate = '_SELECTOR__RANGE_{_PROPERTY_:_VALUE_px}\n';

        CSSRules += CSSRuleTemplate.replace('_SELECTOR_', selector)
          .replace('_RANGE_', range)
          .replace('_PROPERTY_', property)
          .replace('_VALUE_', value);
      }
    });

    return CSSRules;
  }

  /**
   * @function appendCSSRulesToStylesheet
   * Appends the created CSS rules (string) to the empty stylesheet.
   *
   * @param {String} CSSRules A string containing all the calculated CSS rules.
   * @param {HTMLStyleElement} stylesheet An empty stylesheet object to hold the rules.
   */
  function appendCSSRulesToStylesheet(CSSRules, stylesheet) {
    // IE < 8 checking
    if (stylesheet.styleSheet) {
      // eslint-disable-next-line no-param-reassign
      stylesheet.styleSheet.cssText = CSSRules;
    } else {
      stylesheet.appendChild(document.createTextNode(CSSRules));
    }
  }

  /**
   * @function appendStylesheetOnHead
   * Appends the stylesheet to the <head> element once the CSS rules are created.
   *
   * @param {HTMLStyleElement} stylesheet A populated stylesheet object.
   */
  function appendStylesheetOnHead(stylesheet) {
    // Borrowed head detection from restyle.js - thanks, Andrea!
    // https://github.com/WebReflection/restyle/blob/master/src/restyle.js
    const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;

    // Grabs the previous stylesheet
    const legacyStylesheet = document.getElementById(vunit.options.stylesheetId);

    // Removes the previous stylesheet from the head, if any
    if (legacyStylesheet) {
      head.removeChild(legacyStylesheet);
    }

    // Add the new stylesheet to the head
    head.appendChild(stylesheet);
  }

  /**
   * @function calculateViewportSize
   * Calculates the size of the viewport.
   *
   * @returns {Object} An object containing the dimensions of the viewport.
   *
   * Example:
   * return {
   *     width: 768,
   *     height: 1024
   * }
   */
  function calculateViewportSize() {
    const viewportSize = {
      height: document.documentElement.clientHeight,
      width: document.documentElement.clientWidth,
    };

    return viewportSize;
  }

  /**
   * @function viewportHasChanged
   * Checks if the viewport dimensions have changed since the last checking.
   *
   * This checking is very inexpensive, so it allows to regenerate the CSS rules only when
   * it's needed.
   *
   * @returns {Boolean} Wether the dimensions changed or not.
   */
  function viewportHasChanged() {
    const currentViewportSize = calculateViewportSize();
    const differentHeight = (currentViewportSize.height !== vunit.viewportSize.height);
    const differentWidth = (currentViewportSize.width !== vunit.viewportSize.width);

    // Updates the global letiable for future checking
    vunit.viewportSize = currentViewportSize;

    return (differentHeight || differentWidth);
  }

  function viewportObserver() {
    if (viewportHasChanged()) {
      const stylesheet = createStylesheet();
      const CSSRules = createCSSRules();

      appendCSSRulesToStylesheet(CSSRules, stylesheet);
      appendStylesheetOnHead(stylesheet);
      vunit.options.onResize(vunit.viewportSize);
    }
  }

  viewportObserver();

  window.setInterval(
    () => requestAnimationFrame(viewportObserver),
    vunit.options.viewportObserverInterval,
  );
}
