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
 ['The Picture of Dorian Gray','Oscar Wilde',['Classic','Fiction'],'A young man discovers that his portrait records the consequences of a life he tries to keep hidden.'],
 ['Wuthering Heights','Emily Brontë',['Classic','Romance','Fiction'],'Two families on the Yorkshire moors become entangled in love, resentment, and the legacy of earlier choices.'],
 ['Adventures of Huckleberry Finn','Mark Twain',['Classic','Adventure','Fiction'],'A boy and an escaped enslaved man travel along the Mississippi and confront the society around them.'],
 ['The Scarlet Letter','Nathaniel Hawthorne',['Classic','Fiction'],'A woman raises her daughter under the scrutiny of a Puritan community while others conceal their own guilt.'],
 ['Robinson Crusoe','Daniel Defoe',['Classic','Adventure','Fiction'],'A shipwrecked traveller learns to survive on an island and reflects on the life that brought him there.'],
 ['Hamlet','William Shakespeare',['Classic','Drama','Fiction'],'A prince struggles with grief, uncertainty, and the demand to avenge his father.'],
 ['Emma','Jane Austen',['Classic','Romance','Fiction'],'A confident matchmaker discovers the limits of her judgment about her neighbours and herself.'],
 ['Oliver Twist','Charles Dickens',['Classic','Fiction'],'An orphan searches for safety amid the poverty, crime, and institutions of nineteenth-century London.'],
];
const editions = {
 'The Picture of Dorian Gray':['OL8193416W',14314858],
 'Wuthering Heights':['OL21177W',12818862],
 'Adventures of Huckleberry Finn':['OL53908W',8157718],
 'The Scarlet Letter':['OL455305W',5654516],
 'Robinson Crusoe':['OL45089W',368541],
 'Hamlet':['OL9170454W',8281954],
 'Emma':['OL66513W',9278312],
 'Oliver Twist':['OL8193478W',13300802],
 'Pride and Prejudice':['OL66554W',14348537],
 'Frankenstein':['OL450063W',12356249],
 'The Adventures of Sherlock Holmes':['OL262421W',6717853],
 'The Wonderful Wizard of Oz':['OL18417W',552443],
 'Alice’s Adventures in Wonderland':['OL138052W',10527843],
 'A Christmas Carol':['OL32466W',12875748]
};
export const catalog = rows.map(([title,author,categories,description],i)=>{
 const edition=editions[title];
 return {id:edition?'/works/'+edition[0]:`classic-${i+1}`,title,authors:[author],categories,description,thumbnail:edition?'https://covers.openlibrary.org/b/id/'+edition[1]+'-M.jpg?default=false':'',...(edition?{sourceUrl:'https://openlibrary.org/works/'+edition[0]}:{})};
});
export function fallback(genre) {
  const matched = catalog.filter(book => book.categories.some(c => c.toLowerCase() === genre.toLowerCase()));
  return matched.length ? matched : catalog;
}
