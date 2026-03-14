
import xml.etree.ElementTree as ET

def parse(xml_file):
    tree = ET.parse(xml_file)
    root = tree.getroot()

    channels = {}

    for p in root.findall("programme"):
        ch = p.attrib.get("channel")
        title = p.findtext("title")
        start = p.attrib.get("start")
        stop = p.attrib.get("stop")

        channels.setdefault(ch,[]).append({
            "title":title,
            "start":start,
            "stop":stop
        })

    return channels
