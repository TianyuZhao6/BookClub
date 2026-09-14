// A small, explicitly labelled fallback catalogue, independent of external API quota.
// Descriptions are original summaries; no publisher jacket copy is reproduced.
const rows = [
 ['Pride and Prejudice','Jane Austen',['Classic','Romance','Fiction'],'Elizabeth Bennet navigates family expectations, first impressions, and an unexpected romance.'],
 ['Frankenstein','Mary Shelley',['Classic','Horror','Science fiction','Fiction'],'An ambitious scientist brings a creature to life and confronts the consequences of abandoning it.'],
 ['The Time Machine','H. G. Wells',['Science fiction','Adventure','Fiction'],'A Victorian inventor travels into the distant future and discovers a divided human society.'],
 ['The Adventures of Sherlock Holmes','Arthur Conan Doyle',['Mystery','Crime','Short story','Fiction'],'Sherlock Holmes and Dr. Watson investigate a collection of puzzling cases in Victorian England.'],
 ['Little Women','Louisa May Alcott',['Classic','Young adult','Fiction'],'Four sisters grow up through family hardship, creative ambition, friendship, and change.'],
 ['The Art of War','Sun Tzu',['History','War','Politics'],'A concise collection of ideas about strategy, preparation, and responding to conflict.'],
 ['A Room of One’s Own','Virginia Woolf',['Classic','History','Philosophy'],'An extended essay considers the material and social conditions that make creative work possible.'],
 ['The Wonderful Wizard of Oz','L. Frank Baum',['Fantasy','Adventure','Young adult','Fiction'],'Dorothy and her companions travel through a strange land in search of a way home.'],
 ['Walden','Henry David Thoreau',['Classic','Philosophy','Autobiography'],'Reflections on simplicity, nature, work, and deliberate living beside Walden Pond.'],
 ['Alice’s Adventures in Wonderland','Lewis Carroll',['Fantasy','Humor','Adventure','Fiction'],'A curious child enters an unpredictable world of riddles, transformations, and peculiar characters.'],
 ['The Odyssey','Homer',['Poetry','Adventure','Classic'],'Odysseus faces a long and dangerous journey home after the Trojan War.'],
 ['A Christmas Carol','Charles Dickens',['Classic','Fantasy','Short story','Fiction'],'A solitary miser is challenged to reconsider his life during three extraordinary visits.'],
];
export const catalog = rows.map(([title,author,categories,description],i)=>({id:`classic-${i+1}`,title,authors:[author],categories,description,thumbnail:''}));
export function fallback(genre) {
  const matched = catalog.filter(book => book.categories.some(c => c.toLowerCase() === genre.toLowerCase()));
  return matched.length ? matched : catalog;
}
