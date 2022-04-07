function CharacterCount($module) {
  this.$module = $module;
  this.$textarea = $module.querySelector('.nhsuk-js-character-count');
  if (this.$textarea) {
    this.$countMessage = document.getElementById(`${this.$textarea.id}-info`);
  }
}

CharacterCount.prototype.defaults = {
  characterCountAttribute: 'data-maxlength',
  wordCountAttribute: 'data-maxwords',
};

// Initialize component
CharacterCount.prototype.init = function init() {
  // Check for module
  const { $module, $textarea, $countMessage } = this;

  if (!$textarea || !$countMessage) {
    return;
  }

  // We move count message right after the field
  // Kept for backwards compatibility
  $textarea.insertAdjacentElement('afterend', $countMessage);

  // Read options set using dataset ('data-' values)
  this.options = this.getDataset($module);

  // Determine the limit attribute (characters or words)
  let countAttribute = this.defaults.characterCountAttribute;
  if (this.options.maxwords) {
    countAttribute = this.defaults.wordCountAttribute;
  }

  // Save the element limit
  this.maxLength = $module.getAttribute(countAttribute);

  // Check for limit
  if (!this.maxLength) {
    return;
  }

  // Remove hard limit if set
  $textarea.removeAttribute('maxlength');

  // When the page is restored after navigating 'back' in some browsers the
  // state of the character count is not restored until *after* the DOMContentLoaded
  // event is fired, so we need to sync after the pageshow event in browsers
  // that support it.
  if ('onpageshow' in window) {
    window.addEventListener('pageshow', this.sync.bind(this));
  } else {
    window.addEventListener('DOMContentLoaded', this.sync.bind(this));
  }

  this.sync();
};

CharacterCount.prototype.sync = function sync() {
  this.bindChangeEvents();
  this.updateCountMessage();
};

// Read data attributes
CharacterCount.prototype.getDataset = function getDataset(element) {
  const dataset = {};
  const { attributes } = element;
  if (attributes) {
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      const match = attribute.name.match(/^data-(.+)/);
      if (match) {
        dataset[match[1]] = attribute.value;
      }
    }
  }
  return dataset;
};

// Counts characters or words in text
CharacterCount.prototype.count = function count(text) {
  if (this.options.maxwords) {
    const tokens = text.match(/\S+/g) || []; // Matches consecutive non-whitespace chars
    return tokens.length;
  }

  return text.length;
};

// Bind input propertychange to the elements and update based on the change
CharacterCount.prototype.bindChangeEvents = function bindChangeEvents() {
  const { $textarea } = this;
  $textarea.addEventListener('keyup', this.checkIfValueChanged.bind(this));

  // Bind focus/blur events to start/stop polling
  $textarea.addEventListener('focus', this.handleFocus.bind(this));
  $textarea.addEventListener('blur', this.handleBlur.bind(this));
};

// Speech recognition software such as Dragon NaturallySpeaking will modify the
// fields by directly changing its `value`. These changes don't trigger events
// in JavaScript, so we need to poll to handle when and if they occur.
CharacterCount.prototype.checkIfValueChanged = function checkIfValueChanged() {
  if (!this.$textarea.oldValue) this.$textarea.oldValue = '';
  if (this.$textarea.value !== this.$textarea.oldValue) {
    this.$textarea.oldValue = this.$textarea.value;
    this.updateCountMessage();
  }
};

// Update message box
CharacterCount.prototype.updateCountMessage = function updateCountMessage() {
  const countElement = this.$textarea;
  const { options, maxLength } = this;
  const countMessage = this.$countMessage;

  // Determine the remaining number of characters/words
  const currentLength = this.count(countElement.value);
  const remainingNumber = maxLength - currentLength;

  // Set threshold if presented in options
  const thresholdPercent = options.threshold ? options.threshold : 0;
  const thresholdValue = (maxLength * thresholdPercent) / 100;
  if (thresholdValue > currentLength) {
    countMessage.classList.add('nhsuk-character-count__message--disabled');
    // Ensure threshold is hidden for users of assistive technologies
    countMessage.setAttribute('aria-hidden', true);
  } else {
    countMessage.classList.remove('nhsuk-character-count__message--disabled');
    // Ensure threshold is visible for users of assistive technologies
    countMessage.removeAttribute('aria-hidden');
  }

  // Update styles
  if (remainingNumber < 0) {
    countElement.classList.add('nhsuk-textarea--error');
    countMessage.classList.remove('nhsuk-hint');
    countMessage.classList.add('nhsuk-error-message');
  } else {
    countElement.classList.remove('nhsuk-textarea--error');
    countMessage.classList.remove('nhsuk-error-message');
    countMessage.classList.add('nhsuk-hint');
  }

  // Update message
  let charVerb = 'remaining';
  let charNoun = 'character';
  let displayNumber = remainingNumber;
  if (options.maxwords) {
    charNoun = 'word';
  }
  charNoun += (remainingNumber === -1 || remainingNumber === 1 ? '' : 's');

  charVerb = remainingNumber < 0 ? 'too many' : 'remaining';
  displayNumber = Math.abs(remainingNumber);

  countMessage.innerHTML = `You have ${displayNumber} ${charNoun} ${charVerb}`;
};

CharacterCount.prototype.handleFocus = function handleFocus() {
  // Check if value changed on focus
  this.valueChecker = setInterval(this.checkIfValueChanged.bind(this), 1000);
};

CharacterCount.prototype.handleBlur = function handleBlur() {
  // Cancel value checking on blur
  clearInterval(this.valueChecker);
};

export default () => {
  const characterCounts = document.querySelectorAll(
    '[data-module="nhsuk-character-count"]'
  );
  characterCounts.forEach((el) => {
    new CharacterCount(el).init();
  });
};
