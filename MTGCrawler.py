
# coding: utf-8

# In[70]:


import urllib.request
from bs4 import BeautifulSoup
import json
import requests


# In[2]:


starting_card = 0
expected_card_amount = 1282
images_folder = '/images/'
main_url = 'http://magicarena.wikia.com'

parsed_cards = {}
parsed_cards['cards'] = []
cards_url = main_url + '/wiki/Cards'


# In[3]:


web_content = urllib.request.urlopen(cards_url).read()


# In[4]:


soup = BeautifulSoup(web_content, 'html.parser')


# In[5]:


tr_list = soup.find('article').div.div.find_all('tr')[9:]


# In[6]:


done = 0
link_list = []


# In[9]:


for card in tr_list:
    if (done >= starting_card):
        card_name = card.td.a.get('title')
        wiki_link = main_url + card.td.a.get('href')
        link_list.append(wiki_link)
        #print("Appending " + wiki_link)
        
    done = done + 1
    #print("Exp %% done: %.2f" % (done * 100.0 / expected_card_amount))


# In[73]:


done = 0
ready_cards = {}
ready_cards['cards'] = []

for card_link in link_list:
    print("Card " + str(done))
    web_content = urllib.request.urlopen(card_link).read()
    card_soup = BeautifulSoup(web_content, 'html.parser')
    
    #=============== PARSE DATA ===============
    data_table = card_soup.find('table')
    current_card = {}
    for line in data_table.find_all('tr'):
        line_name = line.th.string[:-1]
        line_contents = ''
        line_contents_raw = line.td.contents
        if (line_name == "Expansion"):
            for element in line_contents_raw:
                try:
                    line_contents = line_contents + element.string
                except AttributeError:
                    print(element.string)
                except TypeError:
                    pass
                    #line_contents = str(element.a.title)
            line_contents = line_contents [2:-1]
        else:
            for element in line_contents_raw:
                try:
                    line_contents = line_contents + processAlt(element)
                except AttributeError:
                    line_contents = line_contents + element.string
                except TypeError:
                    pass
            line_contents = line_contents[1:-1]
        try:
            if (line_contents[-1] == '\n'):
                line_contents = line_contents[:-1]
        except IndexError:
            pass
        print("%s : %s" % (line_name, line_contents))
        current_card[line_name] = line_contents
    
    #=============== PARSE IMAGE ===============
    img_list = card_soup.find_all('img')
    sym_name = ''
    #skip = True
    for img in img_list:
        try:
            if ((img['data-image-name'] == (current_card['Name'] + '.png')) & (img['alt'].replace('&#039;', '\'') == current_card['Name'])):
                if (img['src'][:4] != 'data'):
                    this_url = img['src']
                    #sym_name = img['data-image-key']
                    sym_name = current_card['Name'].replace(' ', '_').replace('\'', '') + '.png'
                    print("Got url " + this_url)
                    break
        except KeyError:
            pass
    img_data = requests.get(this_url).content
    print("Sym name = (" + sym_name + ")")
    with open('data/' + sym_name, 'wb') as handler:
        handler.write(img_data)
    
    current_card["Image"] = 'data/' + sym_name
    done = done + 1
    ready_cards['cards'].append(current_card)
    print(">>>>>>>>>>>>>>>>> Exp %% done: %.2f" % (done * 100.0 / expected_card_amount))
    print("==============================================")


# In[48]:


def processAlt(element):
    alt = element.get('alt')
    if (alt != None):
        if (alt == 'Color W'):
            return '(White mana)'
        elif (alt == 'Color U'):
            return '(Blue mana)'
        elif (alt == 'Color B'):
            return '(Black mana)'
        elif (alt == 'Color R'):
            return '(Red mana)'
        elif (alt == 'Color G'):
            return '(Green mana)'
        elif (alt == 'Color C'):
            return '(Colorless mana)'
        elif (alt == 'Mana Tap'):
            return '(Tap)'
        elif (alt == 'UB'):
            return '(Blue/Black mana)'
        elif (alt == 'UR'):
            return '(Blue/Red mana)'
        elif (alt == 'UW'):
            return '(Blue/White mana)'
        elif (alt == 'UG'):
            return '(Blue/Green mana)'
        elif (alt == 'WB'):
            return '(White/Black mana)'
        elif (alt == 'WR'):
            return '(White/Red mana)'
        elif (alt == 'WG'):
            return '(White/Green mana)'
        elif (alt == 'BR'):
            return '(Black/Red mana)'
        elif (alt == 'BG'):
            return '(Black/Green mana)'
        elif (alt == 'RG'):
            return '(Red/Green mana)'
        elif (alt == 'BU'):
            return '(Black/Blue mana)'
        elif (alt == 'RU'):
            return '(Red/Blue mana)'
        elif (alt == 'WU'):
            return '(White/Blue mana)'
        elif (alt == 'GU'):
            return '(Green/Blue mana)'
        elif (alt == 'BW'):
            return '(Black/White mana)'
        elif (alt == 'RW'):
            return '(Red/White mana)'
        elif (alt == 'GW'):
            return '(Green/White mana)'
        elif (alt == 'RB'):
            return '(Red/Black mana)'
        elif (alt == 'GB'):
            return '(Green/Black mana)'
        elif (alt == 'GR'):
            return '(Green/Red mana)'
        elif (alt[0] == 'C'):
            any_amt_s = alt[1:]
            if (any_amt_s == 'X'):
                return "(X mana)"
            else:
                return ("(%d mana)" % int(any_amt_s))
        else:
            print("Got unknown alt " + alt)
            return alt


# In[74]:


with open('data/cards.txt', 'w+') as outfile:  
    json.dump(ready_cards, outfile)

