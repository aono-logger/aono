
/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export interface Entry {
  timestamp : number;
  logger : string;
  level : string;
  message : string;
  meta : Object;
}

export default Entry;

