// Stopwords for text processing

export const BASE_STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
  "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's",
  "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've",
  "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over",
  "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that",
  "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd",
  "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
  "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your",
  "yours", "yourself", "yourselves",
  // generic academic/boilerplate
  "using", "used", "use", "result", "results", "method", "methods", "conclusion", "study", "studies", "based", "analysis",
  "paper", "approach", "new", "also", "well", "show", "shown", "showed", "may", "might", "can", "could", "however", "therefore",
  "within", "among", "across", "found", "significant", "significantly", "present", "presented", "proposed", "provide",
  "provided", "provides", "per", "via", "et", "al", "system", "systems", "different", "including", "similar", "type", "total",
  "group", "groups", "one", "two", "three", "open", "file", "information", "values", "min", "day", "days", "time"
]);

// "non-bio" & platform/search/boilerplate terms
export const EXTRA_STOPWORDS = new Set([
  // platforms / infra
  "doi", "google", "scholar", "pubmed", "pmc", "sci", "biol", "physiol", "microbiol", "res",
  // article furniture
  "article", "articles", "fig", "figure", "table", "tab", "supplementary", "article", "articles", "free", "fig", "figure", "table", "tab", "supplementary", "dataset", "datasets", "file", "files",
  "information", "data", "model", "models", "test", "reads", "open", "find", "number", "values", "sample", "samples",
  // generic org/geo
  "usa", "university", "center", "international", "york", "cornell",
  // nasa / platform terms that aren't topical
  "nasa", "iss", "mission", "missions", "genelab",
  // misc boilerplate or catalog words
  "find", "open", "file", "information", "state", "potential", "identified", "performed",
]);

// Merged stopwords set
export const STOPWORDS = new Set<string>([...BASE_STOPWORDS, ...EXTRA_STOPWORDS]);
