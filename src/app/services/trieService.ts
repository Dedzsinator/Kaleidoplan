// Define interfaces for the values stored in the trie
export interface TrieValue {
  id: string | number;
  name: string;
  location: string;
}

export interface SearchResult {
  word: string;
  value: TrieValue;
}

class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  values: TrieValue[];

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.values = [];
  }
}

export class Trie {
  root: TrieNode;
  private maxResults: number = 10;
  private maxValuesPerNode: number = 5; // Limit values stored per word

  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Insert a searchable item into the trie
   * @param word The text to be searched
   * @param value The associated data (like an event object)
   */
  insert(word: string, value: { id: string | number; name: string; location: string; [key: string]: unknown }): void {
    if (!word || !value || !value.id) return;

    // For very long words, truncate to avoid excessive memory use
    const maxWordLength = 50;
    const lowerWord = word.toLowerCase().slice(0, maxWordLength);

    let current = this.root;

    for (const char of lowerWord) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }

    current.isEndOfWord = true;

    // Add the value if it doesn't already exist and we haven't reached the limit
    if (!current.values.some((v) => v.id === value.id) && current.values.length < this.maxValuesPerNode) {
      // Store minimal information needed for display and navigation
      const lightValue: TrieValue = {
        id: value.id,
        name: value.name,
        location: value.location,
      };
      current.values.push(lightValue);
    }
  }

  /**
   * Find all items that start with the given prefix
   */
  findWordsWithPrefix(prefix: string, limit = 10): SearchResult[] {
    const result: SearchResult[] = [];
    if (!prefix) return result;

    this.maxResults = limit;
    let current = this.root;

    // Convert to lowercase for case-insensitive search
    const lowerPrefix = prefix.toLowerCase();

    // Navigate to the node representing the end of the prefix
    for (const char of lowerPrefix) {
      if (!current.children.has(char)) {
        return result; // No words with this prefix
      }
      current = current.children.get(char)!;
    }

    // Collect all words from this node
    this._collectWords(current, lowerPrefix, result, limit);

    return result;
  }

  /**
   * Helper function to collect words with BFS traversal (more balanced results)
   */
  private _collectWords(node: TrieNode, prefix: string, result: SearchResult[], limit: number): void {
    if (result.length >= limit) return;

    // Use breadth-first search instead of depth-first for more balanced results
    const queue: Array<[TrieNode, string]> = [[node, prefix]];

    while (queue.length > 0 && result.length < limit) {
      const [currentNode, currentPrefix] = queue.shift()!;

      // Add complete words to results
      if (currentNode.isEndOfWord) {
        for (const value of currentNode.values) {
          if (!result.some((r) => r.value && r.value.id === value.id)) {
            result.push({
              word: currentPrefix,
              value: value,
            });

            if (result.length >= limit) break;
          }
        }
      }

      // Add child nodes to queue
      if (result.length < limit) {
        // Use a more efficient way to iterate through Map entries
        currentNode.children.forEach((childNode, char) => {
          queue.push([childNode, currentPrefix + char]);
        });
      }
    }
  }

  /**
   * Clear the trie to free memory
   */
  clear(): void {
    this.root = new TrieNode();
  }
}

// Create and export a singleton instance
export const trieService = new Trie();
