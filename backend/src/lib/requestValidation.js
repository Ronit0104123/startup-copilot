const MAX_IDEA_LENGTH = 1_500;

/**
 * Keep the input contract at the HTTP boundary. Apart from protecting the
 * model context, this gives the UI a useful answer before it starts a long
 * research run for an accidental paste or an empty submission.
 */
export function validateIdea(value) {
  if (typeof value !== "string") {
    return { valid: false, error: "Describe your idea in a sentence or two." };
  }

  const idea = value.trim();
  if (idea.length < 12) {
    return {
      valid: false,
      error: "Add a little more detail so the research has something to work with.",
    };
  }

  if (idea.length > MAX_IDEA_LENGTH) {
    return {
      valid: false,
      error: `Keep the description under ${MAX_IDEA_LENGTH} characters.`,
    };
  }

  return { valid: true, idea };
}

export { MAX_IDEA_LENGTH };
