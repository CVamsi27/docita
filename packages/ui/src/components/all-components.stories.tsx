import * as React from "react";
import { ThemeProvider } from "next-themes";
import { useForm } from "react-hook-form";
import {
  Activity,
  Bell,
  Calendar as CalendarIcon,
  Heart,
  Inbox,
  Search,
  User,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  AppointmentCalendarSkeleton,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Calendar,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  ConfirmationDialog,
  CRUDDialog,
  DatePicker,
  DateTimePicker,
  DebouncedSearchInput,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DocitaIcon,
  DocitaLogo,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  EmptyState,
  Form,
  FormControl,
  FormDescription,
  FormDialog,
  FormDialogFooter,
  FormField,
  FormFieldGroup,
  FormGrid,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
  getStatusColor,
  GradientStatCard,
  Input,
  Label,
  LiveSpeechToText,
  LoadingState,
  MultiStepDialog,
  OnlineStatus,
  PatientListSkeleton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PriorityBadge,
  Progress,
  ProgressStat,
  QuickActionCard,
  RadioGroup,
  RadioGroupItem,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  ScrollBar,
  SearchableSelect,
  SearchDialog,
  SectionHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Slider,
  StatCardSkeleton,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeToggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./index";

const meta = {
  title: "Components/All",
};

export default meta;

function FormExample() {
  const form = useForm<{ fullName: string }>({
    defaultValues: { fullName: "" },
  });

  return (
    <Form {...form}>
      <form className="space-y-3" onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormDescription>This is a demo field</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

export function CorePrimitives() {
  const [checked, setChecked] = React.useState(true);
  const [switchValue, setSwitchValue] = React.useState(false);
  const [slider, setSlider] = React.useState<number[]>([40]);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [dateTime, setDateTime] = React.useState("2026-02-15T10:30");
  const [search, setSearch] = React.useState("initial");

  return (
    <div className="space-y-6 p-4 max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Badge>Badge</Badge>
        <Label htmlFor="input-demo">Input label</Label>
      </div>
      <Input id="input-demo" placeholder="Enter text" />
      <Textarea placeholder="Textarea" />
      <div className="flex items-center gap-4">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => setChecked(Boolean(v))}
        />
        <Switch checked={switchValue} onCheckedChange={setSwitchValue} />
      </div>
      <Slider value={slider} onValueChange={setSlider} max={100} step={1} />
      <Progress value={slider[0]} />
      <RadioGroup defaultValue="a" className="flex gap-3">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="a" id="a" />
          <Label htmlFor="a">Option A</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="b" id="b" />
          <Label htmlFor="b">Option B</Label>
        </div>
      </RadioGroup>
      <DebouncedSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search"
      />
      <DatePicker value={date} onChange={setDate} />
      <DateTimePicker value={dateTime} onChange={setDateTime} />
      <Separator />
      <Calendar mode="single" selected={date} onSelect={setDate} />
    </div>
  );
}

export function DataDisplayAndLayout() {
  return (
    <div className="space-y-6 p-4">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Card title</CardTitle>
          <CardDescription>Card description</CardDescription>
          <CardAction>
            <Badge>New</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>Card content</CardContent>
        <CardFooter>Card footer</CardFooter>
      </Card>
      <Table>
        <TableCaption>Sample table</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Jane Doe</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Tabs defaultValue="one" className="max-w-md">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First tab</TabsContent>
        <TabsContent value="two">Second tab</TabsContent>
      </Tabs>
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="avatar" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <ScrollArea className="h-24 w-72 rounded border p-2">
        <div className="space-y-2">
          <p>Scrollable content line 1</p>
          <p>Scrollable content line 2</p>
          <p>Scrollable content line 3</p>
          <p>Scrollable content line 4</p>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      <ResizablePanelGroup
        direction="horizontal"
        className="max-w-lg rounded border min-h-[120px]"
      >
        <ResizablePanel defaultSize={50} className="p-2">
          Left panel
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} className="p-2">
          Right panel
        </ResizablePanel>
      </ResizablePanelGroup>
      <FormGrid>
        <Input placeholder="First" />
        <Input placeholder="Second" />
      </FormGrid>
      <FormSection
        title="Section"
        description="Section description"
        icon={<Activity className="h-4 w-4" />}
      >
        <Input placeholder="Within section" />
      </FormSection>
      <FormFieldGroup label="Grouped field" hint="Help text">
        <Input placeholder="Grouped input" />
      </FormFieldGroup>
    </div>
  );
}

export function OverlaysAndMenus() {
  const [selectValue, setSelectValue] = React.useState("doctor");
  const [searchableValue, setSearchableValue] = React.useState("one");

  return (
    <div className="space-y-6 p-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Open menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>
            Subscribed
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub action</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Select value={selectValue} onValueChange={setSelectValue}>
        <SelectTrigger>
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="doctor">Doctor</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
        </SelectContent>
      </Select>

      <SearchableSelect
        value={searchableValue}
        onValueChange={setSearchableValue}
        options={[
          { value: "one", label: "First" },
          { value: "two", label: "Second" },
        ]}
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function CommandAndSearch() {
  const [open, setOpen] = React.useState(true);
  const [searchOpen, setSearchOpen] = React.useState(true);

  return (
    <div className="space-y-6 p-4">
      <Command className="rounded border max-w-md">
        <CommandInput placeholder="Command" />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              Patients
              <CommandShortcut>⌘1</CommandShortcut>
            </CommandItem>
            <CommandItem>Appointments</CommandItem>
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
      </Command>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search Patients"
        items={[
          { id: "1", label: "Jane Doe", group: "Patients" },
          { id: "2", label: "John Smith", group: "Patients" },
        ]}
        onSelect={() => undefined}
      />

      <MultiStepDialog
        open={open}
        onOpenChange={setOpen}
        title="Multi-step"
        steps={[
          { id: "a", title: "Step 1", description: "First step" },
          { id: "b", title: "Step 2", description: "Second step" },
        ]}
        currentStepIndex={0}
        onStepChange={() => undefined}
        onComplete={() => undefined}
      >
        <p>Step content</p>
      </MultiStepDialog>
    </div>
  );
}

export function DialogVariants() {
  const [openA, setOpenA] = React.useState(true);
  const [openB, setOpenB] = React.useState(true);
  const [openC, setOpenC] = React.useState(true);

  return (
    <div className="space-y-6 p-4">
      <ConfirmationDialog
        open={openA}
        onOpenChange={setOpenA}
        title="Confirm action"
        description="This is a confirmation dialog"
        onConfirm={() => undefined}
      />
      <CRUDDialog
        open={openB}
        onOpenChange={setOpenB}
        title="CRUD dialog"
        description="Create or update"
      >
        <Input placeholder="Name" />
      </CRUDDialog>
      <FormDialog
        open={openC}
        onOpenChange={setOpenC}
        title="Form dialog"
        description="Form container"
      >
        <form className="space-y-3">
          <Input placeholder="Field" />
          <FormDialogFooter onCancel={() => setOpenC(false)} />
        </form>
      </FormDialog>
    </div>
  );
}

export function StatusAndFeedback() {
  return (
    <div className="space-y-6 p-4 max-w-3xl">
      <Alert>
        <Bell className="h-4 w-4" />
        <AlertTitle>Alert title</AlertTitle>
        <AlertDescription>Alert description text</AlertDescription>
      </Alert>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status="confirmed" />
        <PriorityBadge priority="high" />
        <OnlineStatus online label="Doctor online" />
        <Badge className={getStatusColor("info")}>getStatusColor()</Badge>
      </div>
      <GradientStatCard
        title="Visits"
        value={128}
        icon={Activity}
        color="primary"
        subtitle="this week"
      />
      <QuickActionCard
        icon={CalendarIcon}
        label="Schedule"
        color="blue"
        badge={3}
      />
      <ProgressStat
        label="Completion"
        value="72%"
        progress={72}
        description="Weekly target"
      />
      <EmptyState
        icon={Inbox}
        title="No data"
        description="Add an entry to continue"
      />
      <SectionHeader
        icon={User}
        title="Patients"
        subtitle="Recent updates"
        action={{ label: "View all", href: "#" }}
      />
      <LoadingState message="Loading dashboard" />
      <Skeleton className="h-8 w-full" />
      <StatCardSkeleton />
      <TableSkeleton rows={3} />
      <PatientListSkeleton />
      <AppointmentCalendarSkeleton />
    </div>
  );
}

export function VoiceThemeAndBrand() {
  const [transcript, setTranscript] = React.useState("");

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-3">
          <DocitaIcon className="h-8 w-8" />
          <DocitaLogo />
          <ThemeToggle />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover for tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <LiveSpeechToText onTranscript={(text) => setTranscript(text)} />
        <p className="text-sm text-muted-foreground">
          Transcript: {transcript || "(none)"}
        </p>
      </div>
    </ThemeProvider>
  );
}

export function UtilityCompositions() {
  const [open, setOpen] = React.useState(true);

  return (
    <div className="space-y-6 p-4 max-w-2xl">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Accordion trigger</AccordionTrigger>
          <AccordionContent>Accordion content</AccordionContent>
        </AccordionItem>
      </Accordion>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline">Toggle collapsible</Button>
        </CollapsibleTrigger>
        <CollapsibleContent>Collapsible content</CollapsibleContent>
      </Collapsible>
      <FormExample />
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4" />
        <Search className="h-4 w-4" />
      </div>
    </div>
  );
}
