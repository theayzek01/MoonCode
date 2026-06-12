sed -i '/<\/body>/d' packages/cli/src/modes/web/web-ui.html
sed -i '/<\/html>/d' packages/cli/src/modes/web/web-ui.html
echo "</body>" >> packages/cli/src/modes/web/web-ui.html
echo "</html>" >> packages/cli/src/modes/web/web-ui.html
